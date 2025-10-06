/* ========= Your existing Riot lookup code can live here (unchanged) =========
   If you already have code in script.js, keep it and just append the hover module
   below. Nothing here touches your Lambda or lookup UI. */

/* ====== Architecture hover highlight ======
   When you hover a node, we:
   - add `.mutedAll` on the SVG to dim everything
   - add `.active` to the node and any connected edges + downstream node
*/
(function () {
  const svg = document.querySelector('.arch-svg');
  if (!svg) return;

  const nodes = Array.from(svg.querySelectorAll('.node'));
  const edges = Array.from(svg.querySelectorAll('.e'));

  // Build a quick adjacency map based on data-a -> data-b
  const next = {};
  edges.forEach(e => {
    const a = e.getAttribute('data-a');
    const b = e.getAttribute('data-b');
    if (!next[a]) next[a] = [];
    next[a].push({ edge: e, id: b });
  });

  function clearActive() {
    svg.classList.remove('mutedAll');
    nodes.forEach(n => n.querySelector('.n')?.classList.remove('active'));
    nodes.forEach(n => n.querySelector('.t')?.classList.remove('active'));
    edges.forEach(e => e.classList.remove('active'));
  }

  function activateFrom(id) {
    svg.classList.add('mutedAll');

    // BFS highlight to show a simple downstream flow
    const q = [id];
    const seen = new Set([id]);

    const setNodeActive = (nid) => {
      const g = nodes.find(n => n.getAttribute('data-id') === nid);
      if (!g) return;
      g.querySelector('.n')?.classList.add('active');
      g.querySelector('.t')?.classList.add('active');
    };

    setNodeActive(id);

    while (q.length) {
      const cur = q.shift();
      const outs = next[cur] || [];
      outs.forEach(({ edge, id: to }) => {
        edge.classList.add('active');
        setNodeActive(to);
        if (!seen.has(to)) {
          seen.add(to);
          q.push(to);
        }
      });
    }
  }

  nodes.forEach(n => {
    const id = n.getAttribute('data-id');
    n.addEventListener('mouseenter', () => activateFrom(id));
    n.addEventListener('mouseleave', () => clearActive());
    // also make it keyboard-focus friendly
    n.setAttribute('tabindex', '0');
    n.addEventListener('focus', () => activateFrom(id));
    n.addEventListener('blur', () => clearActive());
  });
})();