import './App.css'

const workstreams = [
  {
    id: 'M1',
    title: 'Vault and Capture Foundation',
    status: 'in progress',
    scope: 'Workspace roots, markdown fidelity, and quick capture flows.',
  },
  {
    id: 'M3',
    title: 'Context Daemon and Compiler',
    status: 'in progress',
    scope: 'State reconciliation, resume bundles, and handoff compilation.',
  },
  {
    id: 'M5',
    title: 'Agent Runtime and Delegation',
    status: 'queued',
    scope: 'Typed actions, policy gates, approval objects, and simulation.',
  },
  {
    id: 'M8',
    title: 'Interoperability and CLI',
    status: 'queued',
    scope: 'Deterministic CLI and artifact validation paths.',
  },
]

const controls = [
  'Resume project context',
  'Run maintenance queue',
  'Promote meeting actions',
  'Generate handoff bundle',
]

function App() {
  return (
    <main className="shell">
      <header className="hero">
        <p className="eyebrow">Thoughtforge Execution Board</p>
        <h1>Cognitive Control Plane Buildout</h1>
        <p className="subtitle">
          SRS-driven delivery for a local-first, agent-native context system.
        </p>
      </header>

      <section className="panel">
        <div className="panel-heading">
          <h2>Active Milestones</h2>
          <span className="chip">SRS v0.4</span>
        </div>
        <ul className="milestones">
          {workstreams.map((item) => (
            <li key={item.id} className="milestone">
              <div className="row">
                <strong>{item.id}</strong>
                <span data-status={item.status}>{item.status}</span>
              </div>
              <h3>{item.title}</h3>
              <p>{item.scope}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>Operator Actions</h2>
          <span className="chip muted">typed actions</span>
        </div>
        <div className="controls">
          {controls.map((label) => (
            <button key={label} type="button">
              {label}
            </button>
          ))}
        </div>
      </section>
    </main>
  )
}

export default App
