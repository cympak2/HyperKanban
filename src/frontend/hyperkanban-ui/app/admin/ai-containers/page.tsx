'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiService } from '@/services/api';
import type { Project, CicServerStatus, CicServerInstance } from '@/types';

// ─── Icons ───────────────────────────────────────────────────────────────────

function IconSpinner() {
  return (
    <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function IconRefresh({ spinning }: { spinning?: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`w-4 h-4 ${spinning ? 'animate-spin' : ''}`}
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path
        fillRule="evenodd"
        d="M16.5 4.478v.227a48.816 48.816 0 0 1 3.878.512.75.75 0 1 1-.256 1.478l-.209-.035-1.005 13.07a3 3 0 0 1-2.991 2.77H8.084a3 3 0 0 1-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 0 1-.256-1.478A48.567 48.567 0 0 1 7.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 0 1 3.369 0c1.603.051 2.815 1.387 2.815 2.951Zm-6.136-1.452a51.196 51.196 0 0 1 3.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 0 0-6 0v-.113c0-.794.609-1.428 1.364-1.452Zm-.355 5.945a.75.75 0 1 0-1.5.058l.347 9a.75.75 0 1 0 1.499-.058l-.346-9Zm5.48.058a.75.75 0 1 0-1.498-.058l-.347 9a.75.75 0 0 0 1.5.058l.345-9Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function IconServer() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-indigo-600">
      <path
        fillRule="evenodd"
        d="M2.25 6a3 3 0 0 1 3-3h13.5a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3V6Zm3.97.97a.75.75 0 0 1 1.06 0l2.25 2.25a.75.75 0 0 1 0 1.06l-2.25 2.25a.75.75 0 0 1-1.06-1.06l1.72-1.72-1.72-1.72a.75.75 0 0 1 0-1.06Zm4.28 4.28a.75.75 0 0 0 0 1.5h3a.75.75 0 0 0 0-1.5h-3Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

type StatusState = 'unknown' | 'checking' | 'reachable' | 'unreachable';

function StatusBadge({ state, error }: { state: StatusState; error?: string }) {
  if (state === 'checking') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
        <IconSpinner />
        Checking…
      </span>
    );
  }
  if (state === 'reachable') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
        Reachable
      </span>
    );
  }
  if (state === 'unreachable') {
    return (
      <span
        title={error}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 cursor-help"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
        Unreachable
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block" />
      Unknown
    </span>
  );
}

// ─── Instance row ─────────────────────────────────────────────────────────────

function InstanceRow({ inst }: { inst: CicServerInstance }) {
  const isRunning = inst.status === 'running';
  return (
    <div className="flex items-start gap-3 px-4 py-2.5 bg-gray-50 border-t border-gray-100 first:border-t-0">
      <span
        className={`mt-1 shrink-0 w-2 h-2 rounded-full ${isRunning ? 'bg-green-500' : 'bg-gray-300'}`}
        title={inst.status}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-mono font-semibold text-gray-800">{inst.instanceName}</span>
          {inst.model && (
            <span className="inline-block text-xs bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-mono">
              {inst.model}
            </span>
          )}
          <span className="inline-block text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono">
            :{inst.port}
          </span>
          {isRunning && inst.uptime && (
            <span className="text-xs text-gray-400">{inst.uptime}</span>
          )}
          {!isRunning && (
            <span className="text-xs text-gray-400">stopped</span>
          )}
        </div>
        <p className="text-xs text-gray-400 truncate mt-0.5" title={inst.workspaceFolder}>
          {inst.workspaceFolder}
        </p>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AiContainersPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState<string | null>(null);

  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const selectedProject = projects.find((p) => p.id === selectedProjectId) ?? null;

  // Per-URL status map: url -> StatusState
  const [statusMap, setStatusMap] = useState<Record<string, { state: StatusState; error?: string }>>({});

  // Copilot server instances fetched from all registered cic HTTP servers
  const [instances, setInstances] = useState<CicServerInstance[]>([]);
  const [instancesLoading, setInstancesLoading] = useState(false);

  // Add form
  const [newUrl, setNewUrl] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [addState, setAddState] = useState<'idle' | 'verifying' | 'saving'>('idle');

  // Refresh all
  const [refreshing, setRefreshing] = useState(false);

  // Remove state
  const [removingUrl, setRemovingUrl] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  // ── Load projects ──────────────────────────────────────────────────────────

  const loadProjects = useCallback(async () => {
    try {
      setProjectsLoading(true);
      setProjectsError(null);
      const list = await apiService.getProjects();
      setProjects(list);
      // Auto-select first project if none selected
      setSelectedProjectId((prev) => {
        if (prev && list.some((p) => p.id === prev)) return prev;
        return list[0]?.id ?? '';
      });
    } catch (e) {
      setProjectsError(e instanceof Error ? e.message : 'Failed to load projects');
    } finally {
      setProjectsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Auto-fetch statuses + instances when selected project changes
  useEffect(() => {
    if (!selectedProject || selectedProject.cicServerUrls.length === 0) {
      setStatusMap({});
      setInstances([]);
      return;
    }
    // Mark all as unknown initially
    const initial: Record<string, { state: StatusState }> = {};
    selectedProject.cicServerUrls.forEach((url) => { initial[url] = { state: 'unknown' }; });
    setStatusMap(initial);
    fetchAllStatuses(selectedProject.id, selectedProject.cicServerUrls);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId]);

  // ── Fetch statuses ─────────────────────────────────────────────────────────

  const fetchAllStatuses = async (projectId: string, urls: string[]) => {
    if (urls.length === 0) return;
    // Mark all as checking
    setStatusMap((prev) => {
      const next = { ...prev };
      urls.forEach((url) => { next[url] = { state: 'checking' }; });
      return next;
    });

    // Health checks and instance list run in parallel
    const [statusResults] = await Promise.all([
      apiService.getCicServerStatuses(projectId).catch(() => [] as CicServerStatus[]),
      (async () => {
        setInstancesLoading(true);
        try {
          const insts = await apiService.getCicServerInstances(projectId);
          setInstances(insts);
        } catch {
          // leave previous instances visible
        } finally {
          setInstancesLoading(false);
        }
      })(),
    ]);

    setStatusMap((prev) => {
      const next = { ...prev };
      statusResults.forEach((r: CicServerStatus) => {
        next[r.url] = { state: r.reachable ? 'reachable' : 'unreachable', error: r.error };
      });
      // anything still 'checking' that didn't come back → unknown
      urls.forEach((url) => { if (next[url]?.state === 'checking') next[url] = { state: 'unknown' }; });
      return next;
    });
  };

  const handleRefreshAll = async () => {
    if (!selectedProject || refreshing) return;
    setRefreshing(true);
    await fetchAllStatuses(selectedProject.id, selectedProject.cicServerUrls);
    setRefreshing(false);
  };

  // ── Add server ─────────────────────────────────────────────────────────────

  const handleAddServer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !newUrl.trim()) return;

    const url = newUrl.trim();

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      setAddError('Please enter a valid URL, e.g. http://localhost:3000');
      return;
    }

    if (selectedProject.cicServerUrls.includes(url)) {
      setAddError('This URL is already registered for this project');
      return;
    }

    setAddError(null);
    setAddState('verifying');

    // Step 1: verify reachability
    let reachable = false;
    let verifyError: string | undefined;

    try {
      const result = await apiService.verifyCicServer(selectedProject.id, url);
      reachable = result.reachable;
      verifyError = result.error;
    } catch (e) {
      verifyError = e instanceof Error ? e.message : 'Verification failed';
    }

    // Step 2: if unreachable, show error and stay in the input field
    if (!reachable) {
      setAddError(`Cannot reach server: ${verifyError ?? 'connection refused'}. Fix the URL and try again.`);
      setAddState('idle');
      return;
    }

    // Step 3: reachable — save and clear input
    setAddState('saving');
    try {
      const updatedUrls = [...selectedProject.cicServerUrls, url];
      const updated = await apiService.updateProject(selectedProject.id, { cicServerUrls: updatedUrls });
      setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setStatusMap((prev) => ({ ...prev, [url]: { state: 'reachable' } }));
      setNewUrl('');
      // Fetch instances now that a new server is registered
      setInstancesLoading(true);
      try {
        const insts = await apiService.getCicServerInstances(updated.id);
        setInstances(insts);
      } catch { /* non-fatal */ }
      finally { setInstancesLoading(false); }
    } catch (e) {
      setAddError(e instanceof Error ? e.message : 'Failed to save server URL');
    } finally {
      setAddState('idle');
    }
  };

  // ── Remove server ──────────────────────────────────────────────────────────

  const handleRemove = async (url: string) => {
    if (!selectedProject || removingUrl) return;
    setRemovingUrl(url);
    setRemoveError(null);
    try {
      const updatedUrls = selectedProject.cicServerUrls.filter((u) => u !== url);
      const updated = await apiService.updateProject(selectedProject.id, { cicServerUrls: updatedUrls });
      setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setStatusMap((prev) => {
        const next = { ...prev };
        delete next[url];
        return next;
      });
      setInstances((prev) => prev.filter((i) => i.cicServerUrl !== url));
    } catch (e) {
      setRemoveError(e instanceof Error ? e.message : 'Failed to remove server URL');
    } finally {
      setRemovingUrl(null);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-3xl px-8 py-8 space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">CIC Server Integration</h1>
        <p className="mt-1 text-sm text-gray-500">
          Register <span className="font-medium text-gray-700">copilot-in-container</span> server URLs per project so HyperKanban can route AI work items to running cic instances.
        </p>
      </div>

      {/* Project selector card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-3">
        <label className="block text-sm font-medium text-gray-700">Select project</label>

        {projectsLoading && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <IconSpinner />
            Loading projects…
          </div>
        )}
        {projectsError && <p className="text-sm text-red-600">{projectsError}</p>}

        {!projectsLoading && !projectsError && (
          <select
            value={selectedProjectId}
            onChange={(e) => {
              setSelectedProjectId(e.target.value);
              setAddError(null);
              setRemoveError(null);
              setNewUrl('');
            }}
            className="w-full sm:w-80 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            {projects.length === 0 && <option value="">No projects found</option>}
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} — {p.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Servers card — only shown when a project is selected */}
      {selectedProject && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          {/* Card header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                <IconServer />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">CIC Servers</h2>
                <p className="text-xs text-gray-500">
                  Project <span className="font-mono font-medium">{selectedProject.code}</span>
                  {' '}— {selectedProject.cicServerUrls.length} server{selectedProject.cicServerUrls.length !== 1 ? 's' : ''} registered
                </p>
              </div>
            </div>

            {selectedProject.cicServerUrls.length > 0 && (
              <button
                onClick={handleRefreshAll}
                disabled={refreshing}
                title="Check connectivity for all registered servers"
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition"
              >
                <IconRefresh spinning={refreshing} />
                Refresh all
              </button>
            )}
          </div>

          {/* Server list */}
          <div className="divide-y divide-gray-100">
            {selectedProject.cicServerUrls.length === 0 && (
              <div className="px-6 py-8 text-center text-sm text-gray-400">
                No cic servers registered for this project yet. Add one below.
              </div>
            )}

            {selectedProject.cicServerUrls.map((url) => {
              const st = statusMap[url] ?? { state: 'unknown' as StatusState };
              const isRemoving = removingUrl === url;
              const urlInstances = instances.filter((i) => i.cicServerUrl === url);
              return (
                <div key={url}>
                  {/* Server URL row */}
                  <div className="flex items-center justify-between gap-3 px-6 py-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-mono text-gray-800 truncate" title={url}>{url}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <StatusBadge state={st.state} error={st.error} />
                        {instancesLoading && st.state === 'checking' && (
                          <span className="text-xs text-gray-400">fetching instances…</span>
                        )}
                        {!instancesLoading && st.state === 'reachable' && (
                          <span className="text-xs text-gray-400">
                            {urlInstances.length} instance{urlInstances.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemove(url)}
                      disabled={isRemoving || !!removingUrl}
                      title="Remove this server URL"
                      className="shrink-0 p-1.5 text-gray-400 rounded-lg hover:text-red-500 hover:bg-red-50 disabled:opacity-40 transition"
                    >
                      {isRemoving ? <IconSpinner /> : <IconTrash />}
                    </button>
                  </div>

                  {/* Instance sub-list */}
                  {st.state === 'reachable' && urlInstances.length > 0 && (
                    <div className="ml-6 mr-4 mb-3 rounded-lg border border-gray-100 overflow-hidden">
                      {urlInstances.map((inst) => (
                        <InstanceRow key={inst.instanceName + inst.cicServerUrl} inst={inst} />
                      ))}
                    </div>
                  )}
                  {st.state === 'reachable' && !instancesLoading && urlInstances.length === 0 && (
                    <p className="ml-6 mb-3 text-xs text-gray-400">No copilot server instances on this cic server.</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add server form */}
          <div className="px-6 py-5 border-t border-gray-100 bg-gray-50 rounded-b-xl">
            <form onSubmit={handleAddServer} className="space-y-3">
              <label className="block text-xs font-medium text-gray-700">Add cic server URL</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={newUrl}
                  onChange={(e) => { setNewUrl(e.target.value); setAddError(null); }}
                  placeholder="http://localhost:8080"
                  disabled={addState !== 'idle'}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-gray-100"
                />
                <button
                  type="submit"
                  disabled={!newUrl.trim() || addState !== 'idle'}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition whitespace-nowrap"
                >
                  {addState === 'verifying' && <><IconSpinner /> Verifying…</>}
                  {addState === 'saving' && <><IconSpinner /> Saving…</>}
                  {addState === 'idle' && <>Add &amp; Verify</>}
                </button>
              </div>
              {addError && (
                <p className="text-xs text-red-600">{addError}</p>
              )}
              {removeError && <p className="text-xs text-red-600">{removeError}</p>}
              <p className="text-xs text-gray-400">
                The server must be reachable before it can be added. Start the cic server first with{' '}
                <span className="font-mono">cic server start</span>, then add its URL here.
              </p>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
