import { ProductSpecView } from './ProductSpecView.js';
import { ImplementationOptionsView } from './ImplementationOptionsView.js';
import { EngineringSpecView } from './EngineringSpecView.js';

export class AppShell {
  constructor() {
    this.currentArtifacts = {};
    this.activeTab = 'product-spec';
    this.setupWebSocket();
    this.setupUI();
  }

  setupWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (message.type === 'init') {
        this.currentArtifacts = message.artifacts;
        this.render();
      } else if (message.type === 'artifact_updated') {
        this.currentArtifacts[message.artifact] = message.data;
        this.render();
      } else if (message.type === 'choice_recorded') {
        console.log('[choice]', message);
        this.showNotification(`Selected: ${message.choice}`, 'success');
      }
    };

    ws.onerror = (error) => {
      console.error('[ws error]', error);
      this.showNotification('WebSocket connection failed', 'error');
    };
  }

  setupUI() {
    const root = document.getElementById('root');

    const shell = document.createElement('div');
    shell.className = 'app-shell';

    const header = document.createElement('header');
    header.className = 'header';
    const h1 = document.createElement('h1');
    h1.textContent = 'brocode Visual Companion';
    header.appendChild(h1);

    const statusBar = document.createElement('div');
    statusBar.className = 'status-bar';
    statusBar.id = 'status';
    statusBar.textContent = 'Connecting...';
    header.appendChild(statusBar);

    const nav = document.createElement('nav');
    nav.className = 'tabs';

    const tabs = [
      { id: 'product-spec', label: 'Product Spec' },
      { id: 'implementation-options', label: 'Implementation Options' },
      { id: 'engineering-spec', label: 'Engineering Spec' }
    ];

    tabs.forEach(tab => {
      const btn = document.createElement('button');
      btn.className = 'tab';
      btn.textContent = tab.label;
      btn.dataset.tab = tab.id;
      btn.addEventListener('click', (e) => {
        this.activeTab = e.target.dataset.tab;
        document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.render();
      });
      nav.appendChild(btn);
    });

    const content = document.createElement('main');
    content.className = 'content';
    content.id = 'content';

    const notification = document.createElement('div');
    notification.id = 'notification';
    notification.className = 'notification';

    shell.appendChild(header);
    shell.appendChild(nav);
    shell.appendChild(content);
    shell.appendChild(notification);
    root.appendChild(shell);

    this.updateStatus('Ready');
  }

  render() {
    const content = document.getElementById('content');
    content.innerHTML = '';

    if (this.activeTab === 'product-spec') {
      const view = new ProductSpecView(this.currentArtifacts['product-spec']);
      view.render(content);
    } else if (this.activeTab === 'implementation-options') {
      const view = new ImplementationOptionsView(this.currentArtifacts['implementation-options']);
      view.render(content);
    } else if (this.activeTab === 'engineering-spec') {
      const view = new EngineringSpecView(this.currentArtifacts['engineering-spec']);
      view.render(content);
    }

    // Initialize Mermaid diagrams
    mermaid.contentLoaded();
  }

  updateStatus(message) {
    const statusEl = document.getElementById('status');
    if (statusEl) {
      statusEl.textContent = message;
    }
  }

  showNotification(message, type = 'info') {
    const notifEl = document.getElementById('notification');
    notifEl.textContent = message;
    notifEl.className = `notification notification--${type}`;
    notifEl.style.display = 'block';
    setTimeout(() => {
      notifEl.style.display = 'none';
    }, 3000);
  }
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
  new AppShell();
});
