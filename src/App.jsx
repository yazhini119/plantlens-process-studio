import './App.css'
import { CalmCard } from './components/CalmCard'
import { LayoutWorkbench } from './components/LayoutWorkbench'
import { ParameterDrawer } from './components/ParameterDrawer'
import { PlantScene } from './components/PlantScene'
import { ProjectToolbar } from './components/ProjectToolbar'
import { SceneToolbar } from './components/SceneToolbar'
import { ProjectProvider, useProject } from './store/projectStore'

function Workspace() {
  const { state, dispatch, activeLayout, selectedNode } = useProject()

  return (
    <>
      <ProjectToolbar />
      <main className="app-shell">
        <section className="scene-panel">
          <PlantScene
            project={state.project}
            layout={activeLayout}
            selectedNode={selectedNode}
            sceneCommand={state.ui.sceneCommand}
            onSelect={(nodeId) => dispatch({ type: 'select-node', nodeId })}
          />
          <SceneToolbar />
          <CalmCard />
          <ParameterDrawer />
        </section>
        <LayoutWorkbench />
      </main>
    </>
  )
}

export default function App() {
  return (
    <ProjectProvider>
      <Workspace />
    </ProjectProvider>
  )
}
