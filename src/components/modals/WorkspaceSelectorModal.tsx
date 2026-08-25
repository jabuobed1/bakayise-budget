import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Workspace } from '../../types';
import {
  Plus,
  Edit2,
  Check,
  X,
  LogOut,
  Briefcase,
  UserCheck,
  Globe,
  Lock,
  Sparkles,
  Link2,
  Users,
  ArrowRight,
  Shield,
  Settings,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from 'lucide-react';
import { WorkspaceWizardModal } from './WorkspaceWizardModal';
import { autoConsolidateFamilyWorkspaceData } from '../../services/firestoreService';

interface WorkspaceSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WorkspaceSelectorModal: React.FC<WorkspaceSelectorModalProps> = ({ isOpen, onClose }) => {
  const {
    user,
    member,
    workspaces,
    availablePublicWorkspaces,
    activeWorkspaceId,
    switchWorkspace,
    renameWorkspace,
    joinWorkspace,
    togglePrivacy,
    createWorkspace,
    logout,
  } = useAuth();

  const [isCreatingQuick, setIsCreatingQuick] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  
  // Expanded profile editing for a workspace
  const [expandedProfileWsId, setExpandedProfileWsId] = useState<string | null>(null);
  const [editWsName, setEditWsName] = useState('');

  // Wizard state
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardTargetWsId, setWizardTargetWsId] = useState<string | undefined>(undefined);
  const [wizardTargetWsName, setWizardTargetWsName] = useState<string | undefined>(undefined);

  // Sync / Consolidation state
  const [isConsolidating, setIsConsolidating] = useState(false);
  const [consolidateMessage, setConsolidateMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSyncAll = async () => {
    if (!activeWorkspaceId || !user) return;
    setIsConsolidating(true);
    setConsolidateMessage(null);
    try {
      const res = await autoConsolidateFamilyWorkspaceData(activeWorkspaceId, {
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
      });
      setConsolidateMessage(
        res.consolidatedCount > 0
          ? `Linked & unified ${res.consolidatedCount} items to this family workspace!`
          : 'All family periods, accounts, and debts are already synchronized!'
      );
      setTimeout(() => setConsolidateMessage(null), 4000);
    } catch (e: any) {
      setConsolidateMessage('Failed to consolidate data: ' + (e.message || 'Unknown error'));
      setTimeout(() => setConsolidateMessage(null), 4000);
    } finally {
      setIsConsolidating(false);
    }
  };

  const handleQuickCreate = async () => {
    if (!newWsName.trim()) return;
    await createWorkspace(newWsName.trim(), false);
    setNewWsName('');
    setIsCreatingQuick(false);
  };

  const handleSaveProfile = async (id: string) => {
    if (!editWsName.trim()) return;
    await renameWorkspace(id, editWsName.trim());
    setExpandedProfileWsId(null);
  };

  const openWizardForNew = () => {
    setWizardTargetWsId(undefined);
    setWizardTargetWsName(undefined);
    setIsWizardOpen(true);
  };

  const openWizardForExisting = (ws: Workspace) => {
    setWizardTargetWsId(ws.id);
    setWizardTargetWsName(ws.name);
    setIsWizardOpen(true);
  };

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-xl flex items-center justify-center p-4">
        <div className="bg-[#1C1C1E] border border-white/10 rounded-[32px] max-w-xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 max-h-[90vh] flex flex-col">
          
          {/* Header */}
          <div className="p-6 bg-gradient-to-b from-white/[0.05] to-transparent border-b border-white/10 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">Workspaces & Profiles</h2>
                  <p className="text-xs text-slate-400">Manage budgets, switch accounts, and edit profiles</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Workspace Lists */}
          <div className="p-4 space-y-4 overflow-y-auto flex-1">
            
            {/* Primary Action: Setup Wizard */}
            <button
              onClick={openWizardForNew}
              className="w-full p-4 rounded-2xl bg-gradient-to-r from-emerald-500/20 to-teal-500/15 border border-emerald-500/40 hover:border-emerald-400 text-left transition-all duration-300 flex items-center justify-between group cursor-pointer shadow-lg shadow-emerald-950/40"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-black flex items-center justify-center font-bold shrink-0 group-hover:scale-105 transition-transform">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-white group-hover:text-emerald-300 transition">
                    Create New Workspace (Guided Setup)
                  </h3>
                  <p className="text-xs text-slate-300">
                    Step-by-step assistant to name workspace and assign budget periods, accounts, & baby steps
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-1 transition-transform shrink-0" />
            </button>

            {/* Section 1: Joined Workspaces */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  My Workspaces ({workspaces.length})
                </span>
                <span className="text-[11px] text-slate-500">
                  Click a workspace to switch or expand to edit profile
                </span>
              </div>

              {workspaces.map((ws) => {
                const isActive = ws.id === activeWorkspaceId;
                const isExpanded = expandedProfileWsId === ws.id;
                const isWsPrivate = ws.isPrivate === true;

                return (
                  <div
                    key={ws.id}
                    className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                      isActive
                        ? 'bg-emerald-500/10 border-emerald-500/40 ring-1 ring-emerald-500/20'
                        : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.05] hover:border-white/10'
                    }`}
                  >
                    {/* Main Row */}
                    <div className="p-4 flex items-center justify-between gap-3">
                      <div
                        onClick={() => {
                          if (!isActive) switchWorkspace(ws.id);
                        }}
                        className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                      >
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            isActive ? 'bg-emerald-500 text-black font-bold' : 'bg-white/10 text-slate-300'
                          }`}
                        >
                          <UserCheck className="w-5 h-5" />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className={`text-sm font-bold truncate ${isActive ? 'text-white' : 'text-slate-200'}`}>
                              {ws.name}
                            </h3>
                            {isActive && (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-black text-[10px] font-bold">
                                Active
                              </span>
                            )}
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                                isWsPrivate
                                  ? 'bg-amber-500/20 text-amber-300'
                                  : 'bg-emerald-500/20 text-emerald-300'
                              }`}
                            >
                              {isWsPrivate ? <Lock className="w-2.5 h-2.5" /> : <Globe className="w-2.5 h-2.5" />}
                              {isWsPrivate ? 'Private' : 'Family Public'}
                            </span>
                          </div>

                          <p className="text-[10px] text-slate-400 truncate mt-0.5">
                            ID: <code className="font-mono text-emerald-400">{ws.id}</code> · Updated:{' '}
                            {new Date(ws.updatedAt || ws.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Assign / Link Records Button */}
                        <button
                          onClick={() => openWizardForExisting(ws)}
                          className="px-2.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold border border-emerald-500/30 transition cursor-pointer flex items-center gap-1.5"
                          title="Assign or Link Budget Periods & Accounts"
                        >
                          <Link2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Assign Records</span>
                        </button>

                        {/* Profile / Edit Toggle */}
                        <button
                          onClick={() => {
                            if (isExpanded) {
                              setExpandedProfileWsId(null);
                            } else {
                              setExpandedProfileWsId(ws.id);
                              setEditWsName(ws.name);
                            }
                          }}
                          className={`p-2 rounded-xl border text-xs transition cursor-pointer ${
                            isExpanded
                              ? 'bg-white/20 text-white border-white/30'
                              : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                          }`}
                          title="Edit Workspace Profile & Settings"
                        >
                          <Settings className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Expandable Workspace Profile Editor */}
                    {isExpanded && (
                      <div className="p-4 bg-black/40 border-t border-white/10 space-y-3 animate-in fade-in duration-200">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-300">Workspace Profile Settings</span>
                          <span className="text-[10px] font-mono text-slate-500">{ws.id}</span>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                            Workspace Name
                          </label>
                          <input
                            type="text"
                            value={editWsName}
                            onChange={(e) => setEditWsName(e.target.value)}
                            className="w-full bg-black/50 border border-white/20 focus:border-emerald-500 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                          />
                        </div>

                        <div className="flex items-center justify-between gap-3 pt-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400 font-medium">Access Privacy:</span>
                            <button
                              type="button"
                              onClick={() => togglePrivacy(ws.id, !isWsPrivate)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition cursor-pointer ${
                                isWsPrivate
                                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                              }`}
                            >
                              {isWsPrivate ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                              {isWsPrivate ? 'Private (Personal)' : 'Public (Family Shared)'}
                            </button>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleSaveProfile(ws.id)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-500 text-black text-xs font-bold hover:bg-emerald-400 transition cursor-pointer"
                            >
                              Save Changes
                            </button>
                            <button
                              onClick={() => setExpandedProfileWsId(null)}
                              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 text-xs font-bold transition cursor-pointer"
                            >
                              Close
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Section 2: Other Workspaces */}
            {availablePublicWorkspaces.length > 0 && (
              <div className="space-y-3 pt-3 border-t border-white/10">
                <div className="flex items-center justify-between px-1 text-slate-400">
                  <div className="flex items-center gap-2 text-slate-300 font-bold text-[11px] uppercase tracking-wider">
                    <Users className="w-4 h-4 text-emerald-400" />
                    <span>Other Workspaces ({availablePublicWorkspaces.length})</span>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    Existing workspaces in database
                  </span>
                </div>

                <div className="space-y-2">
                  {availablePublicWorkspaces.map((ws) => {
                    const isWsPrivate = ws.isPrivate === true;
                    return (
                      <div
                        key={ws.id}
                        className="p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/10 flex items-center justify-between gap-3 transition"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-white truncate">{ws.name}</h4>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                                isWsPrivate
                                  ? 'bg-amber-500/20 text-amber-300'
                                  : 'bg-emerald-500/20 text-emerald-300'
                              }`}
                            >
                              {isWsPrivate ? <Lock className="w-2.5 h-2.5" /> : <Globe className="w-2.5 h-2.5" />}
                              {isWsPrivate ? 'Private' : 'Family Public'}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 truncate mt-0.5">
                            ID: <code className="font-mono text-emerald-400">{ws.id}</code>
                            {ws.lastEditedBy ? ` · By: ${ws.lastEditedBy}` : ''}
                            {ws.updatedAt ? ` · Updated: ${new Date(ws.updatedAt).toLocaleDateString()}` : ''}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={async () => {
                              await joinWorkspace(ws.id);
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold shadow-md shadow-emerald-500/20 transition cursor-pointer flex items-center gap-1.5"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Access / Switch</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quick Blank Workspace Creation */}
            {isCreatingQuick ? (
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-emerald-500/30 ring-1 ring-emerald-500/20">
                <input
                  autoFocus
                  placeholder="Workspace Name (e.g. Household Budget)"
                  value={newWsName}
                  onChange={(e) => setNewWsName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleQuickCreate()}
                  className="bg-black/40 border border-white/20 rounded-xl px-3 py-2 text-sm text-white w-full focus:outline-none focus:ring-1 focus:ring-emerald-500 mb-3"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleQuickCreate}
                    className="flex-1 py-2 rounded-xl bg-emerald-500 text-black font-bold text-xs hover:bg-emerald-400 transition cursor-pointer"
                  >
                    Quick Create
                  </button>
                  <button
                    onClick={() => setIsCreatingQuick(false)}
                    className="px-4 py-2 rounded-xl bg-white/5 text-slate-300 font-bold text-xs hover:bg-white/10 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsCreatingQuick(true)}
                className="w-full p-3 rounded-2xl border border-dashed border-white/15 hover:border-white/30 text-slate-400 hover:text-white transition flex items-center justify-center gap-2 text-xs font-bold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Another Workspace (Blank)</span>
              </button>
            )}
          </div>

          {/* Footer / User Info */}
          <div className="p-4 sm:p-6 bg-black/40 border-t border-white/10 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full border border-white/10 overflow-hidden shrink-0 bg-emerald-500/20 flex items-center justify-center text-emerald-300 font-bold text-xs">
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
                  ) : (
                    member?.displayName?.[0] || 'U'
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">{member?.displayName || user?.displayName}</p>
                  <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold transition cursor-pointer shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Setup & Data Linking Wizard Modal */}
      <WorkspaceWizardModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        targetWorkspaceId={wizardTargetWsId}
        existingWorkspaceName={wizardTargetWsName}
      />
    </>
  );
};
