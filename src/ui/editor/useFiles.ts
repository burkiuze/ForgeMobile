import { useEffect, useState } from 'react';
import { FileEntry, listFiles } from '../../core/vfs';
import { useEditor } from '../../state/editor';

/** Project files (optionally under a folder), refreshed whenever files change. */
export function useFiles(prefix = ''): FileEntry[] {
  const project = useEditor((s) => s.project?.id);
  const rev = useEditor((s) => s.filesRev);
  const [files, setFiles] = useState<FileEntry[]>([]);
  useEffect(() => {
    let live = true;
    if (!project) return setFiles([]);
    listFiles(project, prefix)
      .then((f) => live && setFiles(f))
      .catch(() => live && setFiles([]));
    return () => {
      live = false;
    };
  }, [project, rev, prefix]);
  return files;
}
