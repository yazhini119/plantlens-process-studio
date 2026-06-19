import { getAnchorDefinition, getPortDefinition, getStencilDefinition } from './stencils'

function createIssue(layoutId, severity, code, message, entityId) {
  return { id: `${layoutId}-${code}-${entityId}`, layoutId, severity, code, message, entityId }
}

function routeKey(nodeId, portId) {
  return `${nodeId}:${portId}`
}

function mediumMatches(portMedium, routeMedium) {
  if (portMedium === routeMedium) return true
  if (portMedium === 'power' && ['dc-power', 'ac-power'].includes(routeMedium)) return true
  if (routeMedium === 'power' && ['dc-power', 'ac-power'].includes(portMedium)) return true
  return false
}

export function validateProjectDocument(project) {
  const issues = []
  const tags = new Map()

  project.layouts.forEach((layout) => {
    layout.nodes.forEach((node) => {
      const seen = tags.get(node.tag) ?? []
      seen.push({ layoutId: layout.id, nodeId: node.id })
      tags.set(node.tag, seen)
    })
  })

  tags.forEach((entries, tag) => {
    if (entries.length < 2) return
    entries.forEach((entry) => {
      issues.push(createIssue(entry.layoutId, 'high', 'duplicate-tag', `Duplicate tag detected: ${tag}`, entry.nodeId))
    })
  })

  project.layouts.forEach((layout) => {
    const nodesById = new Map(layout.nodes.map((node) => [node.id, node]))
    const connectedPorts = new Set()

    layout.routes.forEach((route) => {
      const fromNode = nodesById.get(route.from.nodeId)
      const toNode = nodesById.get(route.to.nodeId)

      if (!fromNode || !toNode) {
        issues.push(
          createIssue(
            layout.id,
            route.state === 'downstream' ? 'high' : 'medium',
            'broken-route',
            `Route ${route.id} references a missing node.`,
            route.id,
          ),
        )
        return
      }

      const fromPort = getPortDefinition(fromNode.stencilId, route.from.portId, project.library)
      const toPort = getPortDefinition(toNode.stencilId, route.to.portId, project.library)

      if (!fromPort || !toPort) {
        issues.push(createIssue(layout.id, 'high', 'missing-port', `Route ${route.id} references an undefined port.`, route.id))
        return
      }

      connectedPorts.add(routeKey(fromNode.id, fromPort.id))
      connectedPorts.add(routeKey(toNode.id, toPort.id))

      if (!mediumMatches(fromPort.medium, route.medium) || !mediumMatches(toPort.medium, route.medium)) {
        issues.push(
          createIssue(
            layout.id,
            'medium',
            'medium-mismatch',
            `${route.id} uses ${route.medium} but connects ${fromPort.medium} to ${toPort.medium}.`,
            route.id,
          ),
        )
      }
    })

    layout.nodes.forEach((node) => {
      const stencil = getStencilDefinition(node.stencilId, project.library)

      stencil.ports
        .filter((port) => port.required)
        .forEach((port) => {
          if (connectedPorts.has(routeKey(node.id, port.id))) return
          issues.push(
            createIssue(
              layout.id,
              'medium',
              'unconnected-port',
              `${node.tag} is missing a required ${port.label.toLowerCase()} connection.`,
              node.id,
            ),
          )
        })

      if (stencil.family === 'sensor') {
        const connected = stencil.ports.some((port) => connectedPorts.has(routeKey(node.id, port.id)))
        const attached = node.attachments.length > 0
        if (!connected && !attached) {
          issues.push(createIssue(layout.id, 'medium', 'floating-sensor', `${node.tag} is not attached or routed.`, node.id))
        }
      }

      node.attachments.forEach((attachment) => {
        const hostNode = nodesById.get(attachment.targetNodeId)
        if (!hostNode) {
          issues.push(createIssue(layout.id, 'high', 'illegal-attachment', `${node.tag} attachment target is missing.`, node.id))
          return
        }

        const anchor = getAnchorDefinition(hostNode.stencilId, attachment.anchorId, project.library)
        if (!anchor) {
          issues.push(
            createIssue(
              layout.id,
              'high',
              'illegal-attachment',
              `${node.tag} references a missing anchor on ${hostNode.tag}.`,
              node.id,
            ),
          )
        }

        const hostStencil = getStencilDefinition(hostNode.stencilId, project.library)
        if (hostStencil.rules.allowedAttachments?.includes(node.stencilId)) return

        issues.push(
          createIssue(
            layout.id,
            'medium',
            'illegal-attachment',
            `${node.tag} cannot attach to ${hostNode.tag} under the current library rules.`,
            node.id,
          ),
        )
      })
    })
  })

  return issues
}

export function getLayoutIssues(project, layoutId) {
  return validateProjectDocument(project).filter((issue) => issue.layoutId === layoutId)
}
