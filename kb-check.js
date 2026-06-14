const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  await context.addInitScript(() => {
    window.localStorage.setItem('hermes_api_key', 'd507eb97687968dc80f54e095186adc445922c16b788ca34b28242d06324791a');
  });
  const page = await context.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning')
      console.log(`[${msg.type()}] ${msg.text().substring(0, 500)}`);
  });
  page.on('pageerror', err => {
    console.log('[PAGE_ERROR] ' + err.message.substring(0, 500));
  });

  await page.goto('http://127.0.0.1:8648/#/hermes/knowledge-base', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  // Directly evaluate what the router is doing
  const routerInfo = await page.evaluate(() => {
    const app = document.querySelector('#app');
    // Check Vue app state via __vue_app__
    const vueApp = app?.__vue_app__;
    if (!vueApp) return { error: 'No Vue app found' };
    
    // Try to get router via provide
    let router = null;
    try {
      // Vue 3 provides router on app.config.globalProperties
      router = vueApp.config.globalProperties.$router;
    } catch(e) {}
    
    if (!router) return { error: 'No router found', found: false };
    
    const route = router.currentRoute;
    return {
      currentRoute: route.value.fullPath,
      routeName: route.value.name,
      matched: route.value.matched.map(r => ({ path: r.path, name: r.name, components: Object.keys(r.components || {}) })),
    };
  });
  
  console.log('=== ROUTER STATE ===');
  console.log(JSON.stringify(routerInfo, null, 2));

  // Check for the component being rendered
  const componentCheck = await page.evaluate(() => {
    const app = document.querySelector('#app');
    const vueApp = app?.__vue_app__;
    if (!vueApp) return { error: 'No Vue app' };
    
    const rootInstance = vueApp._instance;
    if (!rootInstance) return { error: 'No root instance' };
    
    // Trace component tree
    function traceComponent(vm, depth = 0) {
      if (!vm || depth > 10) return null;
      const type = vm.type;
      const name = type?.__name || type?.name || type?.__file || 'Unknown';
      const subTree = [];
      if (vm.subTree) {
        // Walk the vnode tree
        function walkVNode(vnode, d) {
          if (!vnode) return;
          if (vnode.component) {
            const child = traceComponent(vnode.component, d + 1);
            if (child) subTree.push(child);
          } else if (vnode.children && Array.isArray(vnode.children)) {
            vnode.children.forEach(c => walkVNode(c, d));
          } else if (vnode.dynamicChildren) {
            vnode.dynamicChildren.forEach(c => walkVNode(c, d));
          }
        }
        walkVNode(vm.subTree, depth);
      }
      return { name, subTree };
    }
    
    const tree = traceComponent(rootInstance);
    return { tree };
  });
  
  console.log('\n=== COMPONENT TREE ===');
  console.log(JSON.stringify(componentCheck, null, 2).substring(0, 3000));
  
  await browser.close();
})();
