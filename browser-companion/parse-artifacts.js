import fs from 'fs';
import path from 'path';
import YAML from 'js-yaml';
import MarkdownIt from 'markdown-it';

const md = new MarkdownIt();

export function parseArtifact(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const { frontmatter, body } = extractFrontmatter(content);
  const fileName = path.basename(filePath);

  if (fileName === 'product-spec.md') {
    return parseProductSpec(body, frontmatter);
  } else if (fileName === 'implementation-options.md') {
    return parseImplementationOptions(body, frontmatter);
  } else if (fileName === 'engineering-spec.md') {
    return parseEngineeringSpec(body, frontmatter);
  }

  return null;
}

function extractFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {}, body: content };
  }
  const frontmatter = YAML.load(match[1]) || {};
  const body = match[2];
  return { frontmatter, body };
}

function parseProductSpec(body, frontmatter) {
  const sections = parseMarkdownSections(body);
  const htmlSections = sections.map(sec => ({
    id: slugify(sec.title),
    title: sec.title,
    content: md.render(sec.content),
    mermaid: extractMermaid(sec.content)
  }));

  return {
    type: 'product-spec',
    title: frontmatter.title || 'Product Spec',
    sections: htmlSections,
    lastUpdated: new Date().toISOString()
  };
}

function parseImplementationOptions(body, frontmatter) {
  const approaches = [];
  const approachBlocks = body.split(/\n## Approach /);

  for (let i = 1; i < approachBlocks.length; i++) {
    const blockContent = approachBlocks[i];
    const titleMatch = blockContent.match(/^([^\n]+)/);
    const title = titleMatch ? titleMatch[1] : `Approach ${i}`;
    const id = `option_${String.fromCharCode(96 + i)}`;

    const effort = extractField(blockContent, 'Effort') || 'TBD';
    const cost = extractField(blockContent, 'Cost') || 'TBD';
    const risk = extractField(blockContent, 'Risk') || 'TBD';
    const tradeoffs = extractList(blockContent, 'Tradeoffs');
    const architecture = extractMermaid(blockContent);

    approaches.push({
      id,
      title,
      description: md.render(blockContent.substring(0, 200)),
      effort,
      cost,
      risk,
      tradeoffs,
      architecture
    });
  }

  return {
    type: 'implementation-options',
    title: frontmatter.title || 'Implementation Options',
    approaches,
    lastUpdated: new Date().toISOString()
  };
}

function parseEngineeringSpec(body, frontmatter) {
  const sections = parseMarkdownSections(body);
  const htmlSections = sections.map(sec => ({
    id: slugify(sec.title),
    title: sec.title,
    content: md.render(sec.content),
    diagram: extractMermaid(sec.content)
  }));

  return {
    type: 'engineering-spec',
    title: frontmatter.title || 'Engineering Spec',
    sections: htmlSections,
    lastUpdated: new Date().toISOString()
  };
}

function parseMarkdownSections(body) {
  const sections = [];
  const lines = body.split('\n');
  let currentSection = null;

  for (const line of lines) {
    const headerMatch = line.match(/^## (.+)$/);
    if (headerMatch) {
      if (currentSection) {
        sections.push(currentSection);
      }
      currentSection = {
        title: headerMatch[1],
        content: ''
      };
    } else if (currentSection) {
      currentSection.content += line + '\n';
    }
  }

  if (currentSection) {
    sections.push(currentSection);
  }

  return sections;
}

function extractMermaid(content) {
  const match = content.match(/```mermaid\n([\s\S]*?)\n```/);
  return match ? match[1] : null;
}

function extractField(content, fieldName) {
  const regex = new RegExp(`^${fieldName}:.*$`, 'm');
  const match = content.match(regex);
  return match ? match[0].substring(fieldName.length + 1).trim() : null;
}

function extractList(content, listName) {
  const regex = new RegExp(`^${listName}:([\\s\\S]*?)(?=^[A-Z]|$)`, 'm');
  const match = content.match(regex);
  if (!match) return [];

  const listContent = match[1];
  const items = listContent
    .split('\n')
    .filter(line => line.match(/^\s*[-*]/))
    .map(line => line.replace(/^\s*[-*]\s*/, ''));

  return items;
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '');
}
