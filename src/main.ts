import Graph from 'graphology'
import { parse } from 'graphology-gexf/browser'
import { Sigma } from 'sigma'
import forceAtlas2 from 'graphology-layout-forceatlas2'

async function init() {
  const gexf = await fetch(import.meta.env.BASE_URL + 'gotthelf_network.gexf').then(r => r.text())
  const graph = parse(Graph, gexf)

  graph.forEachNode((node, attrs) => {
    const c = attrs['viz:color'] ?? {}
    graph.setNodeAttribute(node, 'color', `rgb(${c.r ?? 100},${c.g ?? 140},${c.b ?? 220})`)
    graph.setNodeAttribute(node, 'size', parseFloat(attrs['viz:size'] ?? 2) * 3)
    graph.setNodeAttribute(node, 'label', attrs.label ?? node)
    graph.setNodeAttribute(node, 'x', parseFloat(attrs['viz:position']?.x ?? Math.random() * 100))
    graph.setNodeAttribute(node, 'y', parseFloat(attrs['viz:position']?.y ?? Math.random() * 100))
  })

  document.getElementById('stats')!.textContent =
    `${graph.order} nodes · ${graph.size} edges`

  const settings = forceAtlas2.inferSettings(graph)
  forceAtlas2.assign(graph, { iterations: 500, settings })

  // Track selected node for highlight
  let selectedNode: string | null = null

  const renderer = new Sigma(graph, document.getElementById('graph')!, {
    renderEdgeLabels: false,
    defaultEdgeColor: '#4a5568',
    defaultEdgeType: 'arrow',
    labelFont: 'Inter, system-ui, sans-serif',
    labelSize: 12,
    labelWeight: '400',
    labelColor: { color: '#e2e8f0' },
    minCameraRatio: 0.05,
    maxCameraRatio: 10,

    nodeReducer(node, data) {
      if (!selectedNode) return data
      const neighbors = graph.neighbors(selectedNode)
      if (node === selectedNode || neighbors.includes(node)) return data
      return { ...data, color: '#2a2d3a', label: '' }
    },

    edgeReducer(edge, data) {
      if (!selectedNode) return data
      if (graph.hasExtremity(edge, selectedNode)) {
        return { ...data, color: '#94a3b8', size: 2 }
      }
      return { ...data, color: '#1e2030', size: 0.5 }
    },
  })

  renderer.getCamera().animatedReset()

  // Click node → select / deselect
  renderer.on('clickNode', ({ node }) => {
    selectedNode = selectedNode === node ? null : node
    renderer.refresh()
  })

  // Click background → clear selection
  renderer.on('clickStage', () => {
    if (selectedNode) { selectedNode = null; renderer.refresh() }
  })

  // Tooltip on hover
  const tooltip = document.getElementById('tooltip')!
  const ttLabel = document.getElementById('tt-label')!
  const ttMeta = document.getElementById('tt-meta')!

  renderer.on('enterNode', ({ node }) => {
    const a = graph.getNodeAttributes(node)
    ttLabel.textContent = a.label ?? node
    ttMeta.textContent = `degree ${a.degree ?? ''} · community ${a.modularity_class ?? ''}`
    tooltip.style.display = 'block'
  })
  renderer.on('leaveNode', () => { tooltip.style.display = 'none' })

  document.addEventListener('mousemove', e => {
    if (tooltip.style.display === 'block') {
      tooltip.style.left = (e.clientX + 14) + 'px'
      tooltip.style.top = (e.clientY - 10) + 'px'
    }
  })
}

init()
