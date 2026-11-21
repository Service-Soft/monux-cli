import { Dirent, FsUtilities, Path, PathUtilities } from '../encapsulation';

// what a workspace installed or built, which a snapshot keeps as it is instead of holding a copy of it: too big to copy,
// and made again by npm or a build. A new one, like the node_modules of a new project, is removed with its project
const KEPT_NAMES: string[] = ['node_modules', '.git', 'dist', '.angular', 'storybook-static', 'coverage', 'out-tsc'];

// the lockfile of the workspace, after whose restore node_modules may hold what npm installed since
const LOCKFILE: string = 'package-lock.json';

/**
 * The files of a workspace as they were, to restore them after a command was interrupted or crashed. Held in memory,
 * so an interrupted command leaves no copy behind.
 */
export type WorkspaceSnapshot = {
    /**
     * The directory of the workspace.
     */
    root: Path,
    /**
     * The content of every file, by its path relative to the root.
     */
    files: Map<string, Buffer>,
    /**
     * Every directory, by its path relative to the root.
     */
    directories: Set<string>,
    /**
     * What is kept as it is, like node_modules and symbolic links, by its path relative to the root.
     */
    kept: Set<string>
};

/**
 * What restoring a workspace did.
 */
export type WorkspaceRestoreResult = {
    /**
     * Whether a file or directory had to be restored or removed.
     */
    changed: boolean,
    /**
     * Whether the lockfile had to be restored, after which node_modules may hold what npm installed since.
     */
    lockfileChanged: boolean
};

/**
 * Takes the files of a workspace as they are, and restores them.
 */
export abstract class WorkspaceSnapshotUtilities {
    /**
     * Takes the files of the workspace as they are.
     * @param root - The directory of the workspace.
     * @returns The snapshot.
     */
    static async create(root: Path): Promise<WorkspaceSnapshot> {
        const snapshot: WorkspaceSnapshot = { root, files: new Map(), directories: new Set(), kept: new Set() };
        await this.collect(snapshot, root);
        return snapshot;
    }

    /**
     * Restores the files of the workspace as the snapshot holds them: what came since is removed, and what changed or
     * was removed is written again. A file that is unchanged is not touched.
     * @param snapshot - The snapshot.
     * @returns What was restored.
     */
    static async restore(snapshot: WorkspaceSnapshot): Promise<WorkspaceRestoreResult> {
        const result: WorkspaceRestoreResult = { changed: false, lockfileChanged: false };
        await this.removeNew(snapshot, snapshot.root, result);
        for (const directory of snapshot.directories) {
            const path: Path = PathUtilities.resolve(snapshot.root, directory);
            if (!await FsUtilities.exists(path)) {
                await FsUtilities.mkdir(path);
                result.changed = true;
            }
        }
        for (const [file, content] of snapshot.files) {
            const path: Path = PathUtilities.resolve(snapshot.root, file);
            if (await FsUtilities.exists(path) && content.equals(await FsUtilities.readFileBytes(path))) {
                continue;
            }
            await FsUtilities.writeFileBytes(path, content);
            result.changed = true;
            result.lockfileChanged ||= file === LOCKFILE;
        }
        return result;
    }

    private static async collect(snapshot: WorkspaceSnapshot, directory: Path): Promise<void> {
        for (const entry of await FsUtilities.readdir(directory)) {
            const path: Path = PathUtilities.resolve(directory, entry.name);
            const relative: string = PathUtilities.getRelative(snapshot.root, path);
            if (this.isKept(entry)) {
                snapshot.kept.add(relative);
            }
            else if (entry.isDirectory()) {
                snapshot.directories.add(relative);
                await this.collect(snapshot, path);
            }
            else {
                snapshot.files.set(relative, await FsUtilities.readFileBytes(path));
            }
        }
    }

    private static async removeNew(snapshot: WorkspaceSnapshot, directory: Path, result: WorkspaceRestoreResult): Promise<void> {
        for (const entry of await FsUtilities.readdir(directory)) {
            const path: Path = PathUtilities.resolve(directory, entry.name);
            const relative: string = PathUtilities.getRelative(snapshot.root, path);
            if (!this.isInSnapshot(snapshot, entry, relative)) {
                await FsUtilities.rm(path);
                result.changed = true;
            }
            else if (entry.isDirectory() && !this.isKept(entry)) {
                await this.removeNew(snapshot, path, result);
            }
        }
    }

    private static isInSnapshot(snapshot: WorkspaceSnapshot, entry: Dirent, relative: string): boolean {
        if (this.isKept(entry)) {
            return snapshot.kept.has(relative);
        }
        return entry.isDirectory() ? snapshot.directories.has(relative) : snapshot.files.has(relative);
    }

    private static isKept(entry: Dirent): boolean {
        return entry.isSymbolicLink() || KEPT_NAMES.includes(entry.name);
    }
}