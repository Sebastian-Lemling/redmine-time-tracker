import { useState, useCallback, useEffect, useMemo } from "react";
import type { RedmineInstance } from "../types/redmine";
import { api } from "../lib/api";

export function useInstances() {
  const [instances, setInstances] = useState<RedmineInstance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    api<RedmineInstance[]>("/api/instances", { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) {
          setInstances(data.sort((a, b) => a.order - b.order));
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setInstances([{ id: "default", name: "Redmine", url: "", order: 0 }]);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  const renameInstance = useCallback(
    async (instanceId: string, newName: string) => {
      const updated = instances.map((inst) =>
        inst.id === instanceId ? { ...inst, name: newName } : inst,
      );
      setInstances(updated);
      try {
        const result = await api<RedmineInstance[]>("/api/instances", {
          method: "PUT",
          body: JSON.stringify(updated),
        });
        setInstances(result.sort((a, b) => a.order - b.order));
      } catch {
        setInstances(instances);
      }
    },
    [instances],
  );

  const reorderInstances = useCallback(
    async (reordered: RedmineInstance[]) => {
      const withOrder = reordered.map((inst, i) => ({ ...inst, order: i }));
      setInstances(withOrder);
      try {
        const result = await api<RedmineInstance[]>("/api/instances", {
          method: "PUT",
          body: JSON.stringify(withOrder),
        });
        setInstances(result.sort((a, b) => a.order - b.order));
      } catch {
        setInstances(instances);
      }
    },
    [instances],
  );

  const instanceMap = useMemo(() => new Map(instances.map((inst) => [inst.id, inst])), [instances]);

  const getInstanceName = useCallback(
    (instanceId: string): string => instanceMap.get(instanceId)?.name || instanceId,
    [instanceMap],
  );

  return useMemo(
    () => ({
      instances,
      loading,
      renameInstance,
      reorderInstances,
      getInstanceName,
      instanceMap,
    }),
    [instances, loading, renameInstance, reorderInstances, getInstanceName, instanceMap],
  );
}
