// Plain-object stand-ins for File System Access handles, shared by the tests.

export type MockFile = { text: string; lastModified: number };

export type MockFileHandleOptions = {
  /** Entry identity used by `isSameEntry`. Defaults to the name. */
  entryId?: string;
  permission?: PermissionState;
  /** Permission returned by `requestPermission`. Defaults to "granted". */
  permissionAfterRequest?: PermissionState;
  missing?: boolean;
  writeError?: string;
};

export function domError(name: string) {
  return Object.assign(new Error(name), { name });
}

export function mockFileHandle(name: string, file: MockFile, options: MockFileHandleOptions = {}) {
  const state = {
    file: { ...file },
    permission: options.permission ?? ("granted" as PermissionState),
    missing: options.missing ?? false,
    writes: [] as string[],
    aborted: 0,
    requests: 0,
  };
  const handle = {
    kind: "file" as const,
    name,
    entryId: options.entryId ?? name,
    async getFile() {
      if (state.permission !== "granted") throw domError("NotAllowedError");
      if (state.missing) throw domError("NotFoundError");
      const { text, lastModified } = state.file;
      return { name, lastModified, size: new TextEncoder().encode(text).length, text: async () => text };
    },
    async createWritable() {
      if (state.permission !== "granted") throw domError("NotAllowedError");
      let pending = "";
      return {
        async write(data: string) {
          if (options.writeError) throw domError(options.writeError);
          pending += data;
        },
        async close() {
          state.file = { text: pending, lastModified: state.file.lastModified + 1000 };
          state.missing = false;
          state.writes.push(pending);
        },
        async abort() {
          state.aborted += 1;
        },
      };
    },
    async isSameEntry(other: { entryId?: string }) {
      return other.entryId === handle.entryId;
    },
    async queryPermission() {
      return state.permission;
    },
    async requestPermission() {
      state.requests += 1;
      if (state.permission === "prompt") state.permission = options.permissionAfterRequest ?? "granted";
      return state.permission;
    },
  };
  return { handle: handle as unknown as FileSystemFileHandle, state };
}

/** A handle as it comes back from IndexedDB: data only, so it survives structured clone. */
export function storableFileHandle(name: string, entryId = name) {
  return { kind: "file", name, entryId } as unknown as FileSystemFileHandle;
}

export type MockDirectoryShape = { [name: string]: MockDirectoryShape | string };

export function mockDirectoryHandle(name: string, shape: MockDirectoryShape, options: { failOn?: string[] } = {}) {
  const handle = {
    kind: "directory" as const,
    name,
    async *values() {
      if (options.failOn?.includes(name)) throw domError("NotAllowedError");
      for (const [childName, child] of Object.entries(shape)) {
        yield typeof child === "string"
          ? mockFileHandle(childName, { text: child, lastModified: 1 }).handle
          : mockDirectoryHandle(childName, child, options);
      }
    },
  };
  return handle as unknown as FileSystemDirectoryHandle;
}
