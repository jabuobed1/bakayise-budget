import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { FigmaIcon } from '../ui/FigmaIcon';
import {
  Sparkles,
  Plus,
  ArrowRight,
  Shield,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { WorkspaceWizardModal } from './WorkspaceWizardModal';

interface WorkspaceGatekeeperModalProps {
  isOpen: boolean;
}

export const WorkspaceGatekeeperModal: React.FC<WorkspaceGatekeeperModalProps> = ({ isOpen }) => {
  const {
    user,
    member,
    workspaces,
    availablePublicWorkspaces,
    allWorkspaces,
    activeWorkspaceId,
    switchWorkspace,
    createWorkspace,
    joinWorkspace,
  } = useAuth();

  const [newWsName, setNewWsName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState<string | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || activeWorkspaceId) return null;

  // Combine and deduplicate workspaces to display
  const displayWorkspaces = allWorkspaces.length > 0
    ? allWorkspaces
    : [...workspaces, ...availablePublicWorkspaces];

  const handleQuickCreate = async () => {
    if (!newWsName.trim()) {
      setErrorMsg('Please enter a workspace name (e.g. "The Bakayise Household").');
      return;
    }
    setErrorMsg(null);
    setIsCreating(true);
    try {
      await createWorkspace(newWsName.trim(), false);
      setNewWsName('');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to create workspace in Firestore.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSelectExisting = async (wsId: string) => {
    setErrorMsg(null);
    setIsJoining(wsId);
    try {
      await switchWorkspace(wsId);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to select workspace.');
    } finally {
      setIsJoining(null);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[999] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
        <div className="bg-[#1C1C1E] border border-white/15 rounded-[28px] max-w-xl w-full p-6 sm:p-8 shadow-2xl text-white space-y-6 animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-950/40">
              <Layers className="w-7 h-7" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Workspace Selection
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto">
              Select an existing workspace below or create a new one to access all accounts, debts, and pay cycles.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Option A: Available Workspaces to Select */}
          {displayWorkspaces.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Select an Existing Workspace
              </h3>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {displayWorkspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => handleSelectExisting(ws.id)}
                    disabled={isJoining === ws.id}
                    className="w-full p-3.5 rounded-xl bg-white/[0.05] border border-white/10 hover:border-emerald-500/50 hover:bg-emerald-500/10 text-left transition flex items-center justify-between group cursor-pointer"
                  >
                    <div>
                      <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition">
                        {ws.name}
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        {ws.ownerId === user?.uid
                          ? 'Owned by you'
                          : `Created by ${ws.lastEditedBy || ws.lastEditedByEmail || 'Family Member'}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isJoining === ws.id ? (
                        <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                      ) : (
                        <>
                          <span className="text-xs font-semibold text-emerald-400 group-hover:underline">
                            Enter Workspace
                          </span>
                          <ArrowRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
                        </>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <button
              onClick={() => {
                setErrorMsg(null);
                setIsCreating(true);
                createWorkspace('The Bakayise Household', false)
                  .catch((err) => setErrorMsg(err?.message || 'Failed to create workspace.'))
                  .finally(() => setIsCreating(false));
              }}
              disabled={isCreating}
              className="w-full p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/25 transition text-left flex items-center justify-between group cursor-pointer"
            >
              <div>
                <h4 className="text-sm font-bold text-emerald-300 group-hover:text-emerald-200">
                  Open The Bakayise Household Workspace
                </h4>
                <p className="text-xs text-slate-300 mt-0.5">
                  Click here to start budgeting with your family accounts and pay cycles.
                </p>
              </div>
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 group-hover:translate-x-0.5 transition-transform">
                {isCreating ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
              </div>
            </button>
          )}

          {/* Option B: Create New Workspace */}
          <div className="space-y-3 pt-2 border-t border-white/10">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Or Create a New Workspace
            </h3>

            {/* Quick Create Input */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newWsName}
                onChange={(e) => setNewWsName(e.target.value)}
                placeholder="e.g. The Bakayise Household"
                className="flex-1 bg-white/[0.06] border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleQuickCreate();
                }}
              />
              <button
                onClick={handleQuickCreate}
                disabled={isCreating || !newWsName.trim()}
                className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold text-sm rounded-xl transition flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                {isCreating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Create</span>
                  </>
                )}
              </button>
            </div>

            {/* Guided Wizard Button */}
            <button
              onClick={() => setIsWizardOpen(true)}
              className="w-full p-3 rounded-xl bg-white/[0.03] border border-white/10 hover:border-emerald-500/40 hover:bg-white/[0.06] text-left transition flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold text-slate-200 group-hover:text-emerald-300">
                  Launch Guided Workspace Setup Assistant
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-400 transition" />
            </button>
          </div>
        </div>
      </div>

      <WorkspaceWizardModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onFinish={(newId) => {
          setIsWizardOpen(false);
          switchWorkspace(newId);
        }}
      />
    </>
  );
};
