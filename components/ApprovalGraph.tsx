import { Background, Controls, Edge, MiniMap, Node, Position, ReactFlow, useEdgesState, useNodesState, Handle } from '@xyflow/react';
import { CheckCircle2, CircleDashed, Flame, Droplets, Factory, Zap, Building2, User } from 'lucide-react';
import { SectionLabel } from './AppShell';

const initialNodes: Node[] = [
  { id: 'start', position: { x: 20, y: 160 }, data: { label: 'Application\nSubmitted', tone: 'green', icon: 'start', date: '12 Oct 2024' }, type: 'arthix' },
  
  { id: 'land', position: { x: 280, y: 30 }, data: { label: 'MIDC Land Allotment', detail: 'Approved · Area: 2 Acres', tone: 'green', icon: 'building', dept: 'MIDC', owner: 'R. Sharma' }, type: 'arthix' },
  { id: 'power', position: { x: 280, y: 180 }, data: { label: 'Power Load Sanction', detail: 'Approved · 500 kVA', tone: 'green', icon: 'power', dept: 'MSEDCL', owner: 'A. Patel' }, type: 'arthix' },
  { id: 'pollution', position: { x: 280, y: 330 }, data: { label: 'Pollution Consent (CTE)', detail: 'Under Review · Day 12', tone: 'cyan', icon: 'pollution', dept: 'MPCB', owner: 'V. Kumar' }, type: 'arthix' },
  
  { id: 'fire', position: { x: 550, y: 100 }, data: { label: 'Fire Safety NOC', detail: 'Escalated · 04d delay', tone: 'amber', icon: 'fire', dept: 'Fire Dept', owner: 'S. Desai' }, type: 'arthix' },
  { id: 'factory', position: { x: 550, y: 330 }, data: { label: 'Factory License', detail: 'Awaiting CTE approval', tone: 'muted', icon: 'factory', dept: 'DISH', owner: 'Pending' }, type: 'arthix' },
  
  { id: 'ready', position: { x: 820, y: 180 }, data: { label: 'Operational Readiness', tone: 'muted', icon: 'ready', detail: 'Awaiting dependencies' }, type: 'arthix' },
];

const initialEdges: Edge[] = [
  { id: 'e1', source: 'start', target: 'land', type: 'smoothstep', animated: true, style: { stroke: '#7ee2a8', strokeWidth: 1.5 } },
  { id: 'e2', source: 'start', target: 'power', type: 'smoothstep', animated: true, style: { stroke: '#7ee2a8', strokeWidth: 1.5 } },
  { id: 'e3', source: 'start', target: 'pollution', type: 'smoothstep', animated: true, style: { stroke: '#7dd3fc', strokeWidth: 1.5 } },
  
  { id: 'e4', source: 'land', target: 'fire', type: 'smoothstep', animated: true, style: { stroke: '#f4bf73', strokeWidth: 1.5 } },
  { id: 'e5', source: 'power', target: 'fire', type: 'smoothstep', animated: true, style: { stroke: '#f4bf73', strokeWidth: 1.5 } },
  
  { id: 'e6', source: 'pollution', target: 'factory', type: 'smoothstep', animated: false, style: { stroke: '#334155', strokeWidth: 1.5, strokeDasharray: '4 4' } },
  
  { id: 'e7', source: 'fire', target: 'ready', type: 'smoothstep', animated: false, style: { stroke: '#334155', strokeWidth: 1.5, strokeDasharray: '4 4' } },
  { id: 'e8', source: 'factory', target: 'ready', type: 'smoothstep', animated: false, style: { stroke: '#334155', strokeWidth: 1.5, strokeDasharray: '4 4' } },
];

function GraphNode({ data }: { data: any }) { 
  const tones: Record<string, { border: string, bg: string, text: string, darkBg: string }> = {
    green: { border: 'border-arthix-green/40', bg: 'bg-arthix-green/10', text: 'text-arthix-green', darkBg: 'bg-arthix-green/[.03]' },
    amber: { border: 'border-amber-400/50', bg: 'bg-amber-400/10', text: 'text-amber-400', darkBg: 'bg-amber-400/[.03]' },
    cyan: { border: 'border-arthix-cyan/40', bg: 'bg-arthix-cyan/10', text: 'text-arthix-cyan', darkBg: 'bg-arthix-cyan/[.03]' },
    muted: { border: 'border-white/10', bg: 'bg-white/5', text: 'text-white/40', darkBg: 'bg-black/20' }
  };
  const t = tones[data.tone] || tones.muted;
  const icons: Record<string, JSX.Element> = {
    start: <CircleDashed size={14}/>, power: <Zap size={14}/>, fire: <Flame size={14}/>, 
    pollution: <Droplets size={14}/>, ready: <CheckCircle2 size={14}/>, building: <Building2 size={14} />, factory: <Factory size={14} />
  };

  return (
    <div className={`min-w-[200px] rounded-xl border ${t.border} ${t.darkBg} shadow-2xl backdrop-blur-md overflow-hidden transition-all hover:scale-[1.02] duration-300 font-sans`}>
      {data.icon !== 'start' && <Handle type="target" position={Position.Left} className="!w-1.5 !h-3 !rounded-sm !bg-white/20 !border-0" />}
      
      <div className={`flex items-center justify-between px-3 py-2 border-b ${t.border} ${t.bg}`}>
        <div className={`flex items-center gap-1.5 ${t.text}`}>
          {icons[data.icon]}
          <span className="text-[10px] font-bold uppercase tracking-wider">{data.dept || 'SYSTEM'}</span>
        </div>
        {data.date && <span className="text-[9px] text-white/50">{data.date}</span>}
      </div>

      <div className="px-3 py-3">
        <h3 className="text-sm font-medium text-white/90 whitespace-pre-line leading-tight">{data.label}</h3>
        {data.detail && (
          <div className="mt-2 text-[10px] text-white/60 flex items-center gap-1.5">
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${t.text.replace('text-', 'bg-')}`}></span>
            {data.detail}
          </div>
        )}
      </div>

      {data.owner && (
        <div className="px-3 py-2 bg-black/20 border-t border-white/5 flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-white/50">
            <User size={10} />
          </div>
          <span className="text-[9px] text-white/40 font-mono">OWNER: {data.owner}</span>
        </div>
      )}

      {data.icon !== 'ready' && <Handle type="source" position={Position.Right} className="!w-1.5 !h-3 !rounded-sm !bg-white/20 !border-0" />}
    </div>
  );
}

const nodeTypes = { arthix: GraphNode };

export function ApprovalGraph() { 
  const [nodes,, onNodesChange] = useNodesState(initialNodes); 
  const [edges,, onEdgesChange] = useEdgesState(initialEdges); 
  
  return (
    <section className="min-h-[620px] rounded-lg border border-white/10 bg-[#0b0d10] p-5">
      <div className="flex items-start justify-between">
        <div>
          <SectionLabel>02 / Orchestration engine</SectionLabel>
          <h2 className="text-xl font-semibold tracking-[-.04em] mt-1">Approval dependency graph</h2>
          <p className="mt-1 text-sm text-white/40">Real-time parallel routing and department state tracking</p>
        </div>
        <span className="flex items-center gap-2 rounded-full border border-arthix-green/25 bg-arthix-green/[.06] px-3 py-1.5 font-mono text-[10px] uppercase text-arthix-green shadow-[0_0_15px_rgba(126,226,168,0.1)]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current"/> Live Sync
        </span>
      </div>
      
      <div className="mt-6 h-[480px] overflow-hidden rounded-xl border border-white/10 bg-[#080a0d] shadow-inner relative">
        <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} fitView fitViewOptions={{ padding: 0.2 }} minZoom={0.5} maxZoom={1.5} proOptions={{ hideAttribution: true }}>
          <Background color="#1e293b" gap={24} size={2} />
          <Controls className="!bg-[#101318] !border-white/10 !fill-white/70" showInteractive={false}/>
          <MiniMap className="!bg-[#101318] !border-white/10" maskColor="rgba(0,0,0,0.4)" nodeColor={(node) => node.data?.tone === 'amber' ? '#f4bf73' : node.data?.tone === 'green' ? '#7ee2a8' : node.data?.tone === 'cyan' ? '#7dd3fc' : '#334155'}/>
        </ReactFlow>
        <div className="absolute top-4 left-4 flex gap-2">
          <div className="px-2 py-1 rounded bg-black/40 border border-white/5 text-[9px] font-mono text-white/50 backdrop-blur-sm">DAG ENGINE: ACTIVE</div>
          <div className="px-2 py-1 rounded bg-black/40 border border-white/5 text-[9px] font-mono text-white/50 backdrop-blur-sm">8 NODES, 8 EDGES</div>
        </div>
      </div>
      
      <div className="mt-5 grid grid-cols-4 gap-3 text-center">
        <div className="rounded-lg border border-white/5 bg-white/[.02] p-3 transition-colors hover:bg-white/[.04]">
          <b className="block text-xl">07</b><span className="text-[10px] uppercase tracking-wider text-white/40">Total Nodes</span>
        </div>
        <div className="rounded-lg border border-white/5 bg-white/[.02] p-3 transition-colors hover:bg-white/[.04]">
          <b className="block text-xl text-arthix-green">02</b><span className="text-[10px] uppercase tracking-wider text-white/40">Clearances</span>
        </div>
        <div className="rounded-lg border border-white/5 bg-white/[.02] p-3 transition-colors hover:bg-white/[.04]">
          <b className="block text-xl text-arthix-cyan">01</b><span className="text-[10px] uppercase tracking-wider text-white/40">In Progress</span>
        </div>
        <div className="rounded-lg border border-amber-400/20 bg-amber-400/[.03] p-3 shadow-[0_0_20px_rgba(251,191,36,0.05)] transition-colors">
          <b className="block text-xl text-amber-400">01</b><span className="text-[10px] uppercase tracking-wider text-amber-400/60">Bottleneck</span>
        </div>
      </div>
    </section>
  );
}
