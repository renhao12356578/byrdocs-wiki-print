declare namespace chrome {
  namespace storage {
    interface StorageArea {
      get(keys: string | string[] | null): Promise<Record<string, unknown>>;
      set(items: Record<string, unknown>): Promise<void>;
    }
    const local: StorageArea;
    const onChanged: {
      addListener(
        callback: (
          changes: Record<string, chrome.storage.StorageChange>,
          areaName: string,
        ) => void,
      ): void;
    };
    interface StorageChange {
      oldValue?: unknown;
      newValue?: unknown;
    }
  }
}
