const DIRECTORY_HANDLE_DB = 'mymind-directory-handles';
const DIRECTORY_HANDLE_STORE = 'handles';
const DIRECTORY_HANDLE_KEY = 'public-data-directory';

function openDirectoryHandleDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(DIRECTORY_HANDLE_DB, 1);

    request.onerror = () => reject(request.error);
    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(DIRECTORY_HANDLE_STORE)) {
        database.createObjectStore(DIRECTORY_HANDLE_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

export async function rememberDirectoryHandle(
  directoryHandle: FileSystemDirectoryHandle,
) {
  const database = await openDirectoryHandleDb();

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(DIRECTORY_HANDLE_STORE, 'readwrite');
    const store = transaction.objectStore(DIRECTORY_HANDLE_STORE);
    const request = store.put(directoryHandle, DIRECTORY_HANDLE_KEY);

    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });

  database.close();
}

export async function restoreDirectoryHandle() {
  const database = await openDirectoryHandleDb();

  const directoryHandle = await new Promise<FileSystemDirectoryHandle | null>(
    (resolve, reject) => {
      const transaction = database.transaction(DIRECTORY_HANDLE_STORE, 'readonly');
      const store = transaction.objectStore(DIRECTORY_HANDLE_STORE);
      const request = store.get(DIRECTORY_HANDLE_KEY);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        resolve((request.result as FileSystemDirectoryHandle | undefined) ?? null);
      };
    },
  );

  database.close();

  return directoryHandle;
}
