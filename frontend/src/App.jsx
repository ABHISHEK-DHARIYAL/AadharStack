import { useState } from 'react'
import ModelViewer from './components/ModelViewer'
import Workflow from './components/Workflow'
import BriefCheck from './components/BriefCheck'
import SlideOutline from './components/SlideOutline'
import Showcase from './components/Showcase'

const TABS = [['workflow', 'Revit workflow'], ['model', 'Uploaded Revit model (IFC)'], ['check', 'Brief check'], ['slides', 'PPT outline'], ['showcase', 'Showcase']]

export default function App() {
  const [tab, setTab] = useState('workflow')

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center gap-x-6 gap-y-2 bg-ink px-4 py-2.5 text-paper">
        <div className="flex items-baseline gap-2">
          <span className="font-bold text-safety">SIH26116</span>
          <span className="text-sm">Revit companion viewer</span>
        </div>
        <nav className="flex flex-wrap gap-1" aria-label="Sections">
          {TABS.map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)} aria-current={tab === k ? 'page' : undefined}
              className={`rounded-sm px-3 py-1.5 text-sm ${tab === k ? 'bg-paper text-ink' : 'text-paper/80 hover:bg-white/10'}`}>{label}</button>
          ))}
        </nav>
      </header>
      <main className="min-h-0 flex-1 overflow-auto">
        {tab === 'workflow' && <Workflow />}
        {tab === 'model' && <ModelViewer />}
        {tab === 'check' && <BriefCheck />}
        {tab === 'slides' && <SlideOutline />}
        {tab === 'showcase' && <Showcase />}
      </main>
    </div>
  )
}
