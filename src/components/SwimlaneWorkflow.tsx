import { useState, useEffect } from "react";
import { 
  User, 
  GitBranch, 
  Activity, 
  Cloud, 
  Globe, 
  ArrowRight, 
  ArrowDownLeft,
  Terminal,
  Play,
  RotateCcw,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Code2,
  CheckCircle2
} from "lucide-react";

export default function SwimlaneWorkflow() {
  const [activePulse, setActivePulse] = useState<number>(-1);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  // Define the node coordinates and lane details matching the exact uploaded image schema
  const nodes = [
    // 1. Developer
    {
      id: "dev-1",
      lane: "Developer",
      title: "Plan features",
      subtitle: "(UI + rules)",
      step: 0,
       description: "Define optimization modes (BASIC versus DETAIL questionnaire) and custom AI platform prompts (ChatGPT, Claude, Gemini).",
    },
    {
      id: "dev-2",
      lane: "Developer",
      title: "Code + commit",
      step: 1,
      description: "Write TypeScript backend models and responsive React workspace components with zero trace state parameters.",
    },
    {
      id: "dev-3",
      lane: "Developer",
      title: "Push to GitHub",
      step: 2,
      description: "Initiate code checkout checks, commit code blocks, and push branch commits to secure repository.",
    },
    // 2. GitHub
    {
      id: "gh-1",
      lane: "GitHub",
      title: "PR / main merge",
      subtitle: "(public repo)",
      step: 3,
      description: "Trigger secure automated reviewer workflows. Secure client authentication credentials and secrets under GitHub variables.",
    },
    // 3. CI/CD
    {
      id: "cicd-1",
      lane: "CI/CD",
      title: "Actions: Test",
      step: 4,
      description: "Automated standard TypeScript compiler checks, module lint validations, and schema dependency sanity tests.",
    },
    {
      id: "cicd-2",
      lane: "CI/CD",
      title: "Actions: Build",
      step: 5,
      description: "Compile and package application into robust production bundle with optimized static assets and self-contained server bundle.",
    },
    {
      id: "cicd-3",
      lane: "CI/CD",
      title: "Actions: Deploy",
      step: 6,
      description: "Continuous delivery hooks push package components live onto Google Cloud Run sandbox container ingress routing.",
    },
    // 4. Hosting
    {
      id: "host-1",
      lane: "Hosting",
      title: "Release URL",
      subtitle: "+ domain",
      step: 7,
      description: "The live secured web app is assigned high-availability reverse proxy endpoints reachable directly at port 3000.",
    },
    // 5. Public User
    {
      id: "user-1",
      lane: "Public User",
      title: "Open app link",
      step: 8,
      description: "Accessible via SSL secure browser endpoint connecting users to active NEXA Gatekeeper login window.",
    },
    {
      id: "user-2",
      lane: "Public User",
      title: "Use NEXA",
      subtitle: "(BASIC/DETAIL)",
      step: 9,
      description: "Input vague request prompts, answer interactive context queries, and execute the 4-D optimization compiler.",
    },
    {
      id: "user-3",
      lane: "Public User",
      title: "Copy optimized prompt",
      subtitle: "Use in any AI tool",
      step: 10,
      description: "Collect high-fidelity parameterized instructions and export them styled with custom structure markers for prompt tools.",
    }
  ];

  // Simulates the flow pulse through each node in sequence
  const startSimulation = () => {
    if (isSimulating) return;
    setIsSimulating(true);
    setActivePulse(0);
  };

  useEffect(() => {
    if (!isSimulating || activePulse === -1) return;

    if (activePulse >= nodes.length) {
      const timeout = setTimeout(() => {
        setIsSimulating(false);
        setActivePulse(-1);
      }, 1500);
      return () => clearTimeout(timeout);
    }

    const duration = activePulse === 3 || activePulse === 7 || activePulse === 8 ? 1400 : 800;
    const timeout = setTimeout(() => {
      setActivePulse(prev => prev + 1);
    }, duration);

    return () => clearTimeout(timeout);
  }, [activePulse, isSimulating]);

  const resetSimulation = () => {
    setIsSimulating(false);
    setActivePulse(-1);
    setSelectedNode(null);
  };

  return (
    <div className="rounded-2xl border border-slate-900 bg-slate-950/90 p-5 font-sans relative overflow-hidden backdrop-blur-md">
      {/* Absolute Decorative Grid Line Matching Blueprint Aesthetic */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b08_1px,transparent_1px),linear-gradient(to_bottom,#1e293b08_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-900 pb-4 mb-6 relative z-10">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping shrink-0" />
            <h2 className="text-sm font-display font-bold text-slate-100 uppercase tracking-wider">
              NEXA — Swimlane Workflow Architecture
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Interactive DevOps blueprint portraying full-cycle compilation, security gates, and distribution.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={startSimulation}
            disabled={isSimulating}
            className="px-3.5 py-1.5 rounded-lg bg-indigo-600/80 hover:bg-indigo-500 text-white font-mono text-[10px] font-bold tracking-wider uppercase transition-all flex items-center gap-1.5 disabled:opacity-40 cursor-pointer shadow-lg shadow-indigo-500/10"
          >
            <Play className={`w-3 h-3 ${isSimulating ? "text-indigo-300" : "text-white"}`} />
            {isSimulating ? `Pulsing step ${activePulse + 1}/11...` : "Simulate Live Pulse"}
          </button>

          <button
            type="button"
            onClick={resetSimulation}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-850 text-slate-400 hover:text-slate-200 cursor-pointer transition-colors"
            title="Reset Simulation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Swimlanes container */}
      <div className="space-y-4 relative overflow-x-auto pb-4 z-10 min-w-[700px]">
        
        {/* SWIM_LANE 1: DEVELOPER */}
        <div className="grid grid-cols-12 items-center rounded-xl bg-slate-900/15 border border-slate-900/40 p-1 min-h-[92px]">
          <div className="col-span-2 flex items-center gap-2 px-3 text-indigo-400 font-mono text-[11px] font-bold tracking-wider uppercase select-none border-r border-slate-900/60 h-full">
            <User className="w-4 h-4 text-indigo-400" />
            <span>Developer</span>
          </div>
          
          <div className="col-span-10 px-4 flex items-center justify-around relative">
            {/* Developer Nodes */}
            {nodes.filter(n => n.lane === "Developer").map((node, idx) => {
              const active = activePulse === node.step;
              const completed = activePulse > node.step;
              return (
                <div key={node.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedNode(node.id)}
                    className={`px-3 py-2 rounded-xl text-[11px] font-mono border text-left transition-all max-w-[135px] cursor-pointer ${
                      active 
                        ? "bg-indigo-950/80 border-indigo-400 text-indigo-200 ring-2 ring-indigo-400/20 scale-105 shadow-lg shadow-indigo-500/10" 
                        : completed 
                        ? "bg-slate-900/40 border-slate-800 text-slate-400" 
                        : "bg-[#090d16] border-slate-850 text-slate-300 hover:border-slate-700 hover:text-slate-100"
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1">
                      {completed && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                      <span className="truncate">{node.title}</span>
                    </div>
                    {node.subtitle && <span className="block text-[9px] text-slate-500 mt-0.5 leading-tight">{node.subtitle}</span>}
                  </button>

                  {idx < 2 && (
                    <ChevronRight className={`w-4 h-4 shrink-0 font-bold transition-colors ${
                      activePulse > node.step ? "text-indigo-500" : "text-slate-700"
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* TRANSITION CONNECTOR ROW: Plan & Commit to Build -> GitHub Lane */}
        <div className="flex justify-end pr-14 relative h-6">
          <div className="w-[1px] h-full border-r border-dashed border-slate-800 flex items-center justify-center">
            <div className={`w-2 h-2 rounded-full absolute transition-all duration-700 ${
              activePulse === 3 ? "bg-indigo-400 scale-110 animate-ping" : "bg-transparent"
            }`} style={{ top: "0%" }} />
          </div>
        </div>

        {/* SWIM_LANE 2: GITHUB */}
        <div className="grid grid-cols-12 items-center rounded-xl bg-slate-900/15 border border-slate-900/40 p-1 min-h-[92px]">
          <div className="col-span-2 flex items-center gap-2 px-3 text-indigo-400 font-mono text-[11px] font-bold tracking-wider uppercase select-none border-r border-slate-900/60 h-full">
            <GitBranch className="w-4 h-4 text-indigo-400 animate-pulse" />
            <span>GitHub</span>
          </div>

          <div className="col-span-10 px-4 grid grid-cols-3 items-center relative">
            {/* Security Note left placeholder */}
            <div className="col-span-2 p-3 rounded-xl bg-[#090d16] border border-slate-900 text-[10px] text-slate-400 leading-normal font-sans max-w-[280px]">
              <span className="block font-semibold text-slate-200 uppercase font-mono tracking-wider text-[9px] text-indigo-400/90 mb-0.5">🔒 Environment Isolation Note</span>
              Maintain standard stateless logic processes. Secure personal API credentials in GitHub Secrets or hosting env vars.
            </div>

            {/* Merge node */}
            {nodes.filter(n => n.lane === "GitHub").map((node) => {
              const active = activePulse === node.step;
              const completed = activePulse > node.step;
              return (
                <div key={node.id} className="justify-self-end flex items-center pr-3">
                  <button
                    type="button"
                    onClick={() => setSelectedNode(node.id)}
                    className={`px-3 py-2 rounded-xl text-[11px] font-mono border text-left transition-all cursor-pointer max-w-[145px] ${
                      active 
                        ? "bg-indigo-950/80 border-indigo-400 text-indigo-200 ring-2 ring-indigo-400/20 scale-105 shadow-lg shadow-indigo-500/10" 
                        : completed 
                        ? "bg-slate-900/40 border-slate-800 text-slate-400" 
                        : "bg-[#090d16] border-slate-850 text-slate-300 hover:border-slate-700 hover:text-slate-100"
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1">
                      {completed && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                      <span>{node.title}</span>
                    </div>
                    {node.subtitle && <span className="block text-[9px] text-slate-500 mt-0.5 leading-tight">{node.subtitle}</span>}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* TRANSITION CONNECTOR ROW: GitHub to CI/CD actions */}
        <div className="flex justify-start relative h-8 pr-16" style={{ paddingRight: "140px" }}>
          <div className="w-full flex justify-end relative h-full">
            {/* Draw diagonal layout simulation trail */}
            <div className="w-[30%] border-t border-r border-dashed border-slate-800 rounded-tr h-full mr-2"></div>
            {isSimulating && activePulse === 4 && (
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 absolute right-[100px] top-[10px] animate-pulse" />
            )}
          </div>
        </div>

        {/* SWIM_LANE 3: CI/CD */}
        <div className="grid grid-cols-12 items-center rounded-xl bg-slate-900/15 border border-slate-900/40 p-1 min-h-[92px]">
          <div className="col-span-2 flex items-center gap-2 px-3 text-indigo-400 font-mono text-[11px] font-bold tracking-wider uppercase select-none border-r border-slate-900/60 h-full">
            <Activity className="w-4 h-4 text-indigo-400" />
            <span>CI/CD</span>
          </div>

          <div className="col-span-10 px-4 flex items-center justify-around relative">
            {/* CI/CD Actions Nodes */}
            {nodes.filter(n => n.lane === "CI/CD").map((node, idx) => {
              const active = activePulse === node.step;
              const completed = activePulse > node.step;
              return (
                <div key={node.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedNode(node.id)}
                    className={`px-3 py-2 rounded-xl text-[11px] font-mono border text-left transition-all cursor-pointer max-w-[135px] ${
                      active 
                        ? "bg-indigo-950/80 border-indigo-400 text-indigo-200 ring-2 ring-indigo-400/20 scale-105 shadow-lg shadow-indigo-500/10" 
                        : completed 
                        ? "bg-slate-900/40 border-slate-800 text-slate-400" 
                        : "bg-[#090d16] border-slate-850 text-slate-300 hover:border-slate-700 hover:text-slate-100"
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1">
                      {completed && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                      <span>{node.title}</span>
                    </div>
                  </button>

                  {idx < 2 && (
                    <ChevronRight className={`w-4 h-4 shrink-0 font-bold transition-colors ${
                      activePulse > node.step ? "text-indigo-500" : "text-slate-700"
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* TRANSITION CONNECTOR ROW: Deploy to Hosting endpoint */}
        <div className="flex justify-start relative h-8 pr-16" style={{ paddingLeft: "260px" }}>
          <div className="w-[100px] border-l border-b border-dashed border-slate-800 rounded-bl h-full ml-2"></div>
        </div>

        {/* SWIM_LANE 4: HOSTING */}
        <div className="grid grid-cols-12 items-center rounded-xl bg-slate-900/15 border border-slate-900/40 p-1 min-h-[92px]">
          <div className="col-span-2 flex items-center gap-2 px-3 text-indigo-400 font-mono text-[11px] font-bold tracking-wider uppercase select-none border-r border-slate-900/60 h-full">
            <Cloud className="w-4 h-4 text-indigo-400" />
            <span>Hosting</span>
          </div>

          <div className="col-span-10 px-4 flex items-center justify-start pl-16 relative">
            {/* Hosting Nodes */}
            {nodes.filter(n => n.lane === "Hosting").map((node) => {
              const active = activePulse === node.step;
              const completed = activePulse > node.step;
              return (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => setSelectedNode(node.id)}
                  className={`px-3 py-2 rounded-xl text-[11px] font-mono border text-left transition-all cursor-pointer max-w-[145px] ${
                    active 
                      ? "bg-indigo-950/80 border-indigo-400 text-indigo-200 ring-2 ring-indigo-400/20 scale-105 shadow-lg shadow-indigo-500/10" 
                      : completed 
                      ? "bg-slate-900/40 border-slate-800 text-slate-400" 
                      : "bg-[#090d16] border-slate-850 text-slate-300 hover:border-slate-700 hover:text-slate-100"
                  }`}
                >
                  <div className="font-bold flex items-center gap-1">
                    {completed && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                    <span>{node.title}</span>
                  </div>
                  {node.subtitle && <span className="block text-[9px] text-slate-500 mt-0.5 leading-tight">{node.subtitle}</span>}
                </button>
              );
            })}
            <div className="ml-4 p-2 bg-[#090d16] border border-slate-900/80 rounded-xl text-[10px] text-slate-400 max-w-[320px]">
              Proxy routes direct connection handles over TLS sandbox.
            </div>
          </div>
        </div>

        {/* TRANSITION CONNECTOR ROW: Hosting to Public User */}
        <div className="flex justify-start relative h-8 pr-16" style={{ paddingLeft: "100px" }}>
          <div className="w-[120px] border-l border-b border-dashed border-slate-800 rounded-bl h-full ml-2"></div>
        </div>

        {/* SWIM_LANE 5: PUBLIC USER */}
        <div className="grid grid-cols-12 items-center rounded-xl bg-slate-900/15 border border-slate-900/40 p-1 min-h-[92px]">
          <div className="col-span-2 flex items-center gap-2 px-3 text-indigo-400 font-mono text-[11px] font-bold tracking-wider uppercase select-none border-r border-slate-900/60 h-full">
            <Globe className="w-4 h-4 text-indigo-400" />
            <span>Public User</span>
          </div>

          <div className="col-span-10 px-4 flex items-center justify-around relative">
            {/* Public User Nodes */}
            {nodes.filter(n => n.lane === "Public User").map((node, idx) => {
              const active = activePulse === node.step;
              const completed = activePulse > node.step;
              return (
                <div key={node.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedNode(node.id)}
                    className={`px-3 py-2 rounded-xl text-[11px] font-mono border text-left transition-all cursor-pointer max-w-[145px] ${
                      active 
                        ? "bg-indigo-950/80 border-indigo-400 text-indigo-200 ring-2 ring-indigo-400/20 scale-105 shadow-lg shadow-indigo-500/10" 
                        : completed 
                        ? "bg-slate-900/40 border-slate-800 text-slate-400" 
                        : "bg-[#090d16] border-slate-850 text-slate-300 hover:border-slate-700 hover:text-slate-100"
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1">
                      {completed && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                      <span>{node.title}</span>
                    </div>
                    {node.subtitle && <span className="block text-[9px] text-slate-500 mt-0.5 leading-tight">{node.subtitle}</span>}
                  </button>

                  {idx < 2 && (
                    <ChevronRight className={`w-4 h-4 shrink-0 font-bold transition-colors ${
                      activePulse > node.step ? "text-indigo-500" : "text-slate-700"
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Selected Block Info Detail Panel */}
      <div className="mt-5 p-4 rounded-xl bg-slate-900 border border-slate-850 text-xs relative z-10 transition-all">
        {selectedNode ? (
          <div>
            <div className="flex items-center gap-2 text-indigo-400 font-mono font-bold uppercase text-[10px] tracking-wider mb-1">
              <Code2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Step Detail: {nodes.find(n => n.id === selectedNode)?.lane} &rsaquo; {nodes.find(n => n.id === selectedNode)?.title}</span>
            </div>
            <p className="text-slate-300 font-sans leading-relaxed">
              {nodes.find(n => n.id === selectedNode)?.description}
            </p>
          </div>
        ) : (
          <div className="text-slate-500 font-sans italic py-1 flex items-center justify-between">
            <span>💡 Click any workflow node or card above to trigger direct system descriptions.</span>
            <button
              type="button"
              onClick={() => setSelectedNode("user-2")}
              className="text-xs text-indigo-400 font-mono hover:underline cursor-pointer"
            >
              Examine Optimizer Stage
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
