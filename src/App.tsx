import { ComponentProps, useCallback, useEffect, useRef, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import MarkdownPreview from "@uiw/react-markdown-preview";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "./components/ui/resizable";
import { githubDark } from "@uiw/codemirror-theme-github";
import { File, db } from "./db";
import { useDebouncedEffect } from "./use-debounced-effect";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useLiveQuery } from "dexie-react-hooks";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "./components/ui/sheet";
import { HamburgerMenuIcon, TrashIcon, Pencil1Icon, CheckIcon, Cross1Icon } from "@radix-ui/react-icons";
import { Button } from "./components/ui/button";
import { useToast } from "./components/ui/use-toast";
import { Input } from "./components/ui/input";
import { cn } from "./lib/utils";

export default function App() {
  return (
    <div>
      <Header />
      <Body />
    </div>
  );
}

function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="flex min-h-16 items-center px-4">
      <MenuSheet open={menuOpen} onOpenChange={setMenuOpen}>
        <MenuSheetButton>
          <HamburgerMenuIcon className="size-6" />
        </MenuSheetButton>
      </MenuSheet>
      <h2 className="ml-4">
        <a href="/" className="text-xl font-semibold uppercase tracking-widest">
          MARKDOWN
        </a>
      </h2>
    </header>
  );
}

type MenuSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
};

function MenuSheet({ open, onOpenChange, children }: MenuSheetProps) {
  const files = useLiveQuery(() => db.getAllFiles(), [open]);
  const [loadingFiles, setLoadingFiles] = useState(!files);
  const { toast } = useToast();
  const { setActiveFileId } = useActiveFileId();

  useEffect(() => {
    if (files) setLoadingFiles(false);
  }, [files]);

  const closeSheet = () => onOpenChange(false);

  const openFile = async (fileId: NonNullable<File["id"]>) => {
    setActiveFileId(fileId);
    closeSheet();
  };

  const deleteFile = async (fileId: NonNullable<File["id"]>) => {
    await db.deleteFile(fileId);
    toast({
      title: "File Deleted",
    });
    const file = await db.getFirstFile();
    if (file) {
      setActiveFileId(file.id!);
    } else {
      // Create a new file if there are no files left.
      const fileId = await db.createFile();
      setActiveFileId(fileId);
    }
  };

  const onRename = async (fileId: NonNullable<File["id"]>, newName: string) => {
    await db.updateFileName(fileId, newName);
    toast({
      title: "File Renamed",
    });
  };

  const onNewFile = async () => {
    const fileId = await db.createFile();
    setActiveFileId(fileId);
    closeSheet();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {children}
      <SheetContent side="left" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Files</SheetTitle>
        </SheetHeader>
        <div className="mt-8 flex flex-col gap-2">
          {loadingFiles ? (
            <div>Loading...</div>
          ) : (
            files!.map((file) => (
              <MenuFileButton key={file.id} file={file} onRename={onRename} onDelete={deleteFile} onOpen={openFile} />
            ))
          )}
          <Button onClick={onNewFile} variant="secondary">
            New File
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

type MenuFileButtonProps = {
  file: File;
  onDelete: (fileId: NonNullable<File["id"]>) => void | Promise<void>;
  onRename: (fileId: NonNullable<File["id"]>, newName: string) => void | Promise<void>;
  onOpen: (fileId: NonNullable<File["id"]>) => void | Promise<void>;
};

function MenuFileButton({ file, onDelete, onRename, onOpen }: MenuFileButtonProps) {
  const [mode, setMode] = useState<"view" | "edit">("view");
  const inputRef = useRef<HTMLInputElement>(null);
  const { activeFileId } = useActiveFileId();

  const onDeleteClick = () => {
    onDelete(file.id!);
  };

  const onOpenClick = () => {
    onOpen(file.id!);
  };

  const onRenameSave = useCallback(async () => {
    const input = inputRef.current;
    if (!input) return;
    onRename(file.id!, input.value);
    setMode("view");
  }, [file.id, onRename]);

  const onEditModeKeydownHandler = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onRenameSave();
    }

    if (e.key === "Escape") {
      setMode("view");
      e.stopPropagation();
    }
  };

  const isActive = activeFileId === file.id;

  if (mode === "edit") {
    return (
      <div className="relative">
        <Input ref={inputRef} autoFocus className="w-full" defaultValue={file.name} onKeyDown={onEditModeKeydownHandler} />
        <div className="absolute right-0 top-0">
          <Button
            onKeyDown={onEditModeKeydownHandler}
            onClick={onRenameSave}
            size="icon"
            variant="ghost"
            className="hover:dark:bg-green-600"
          >
            <CheckIcon className="size-5" />
          </Button>
          <Button
            onKeyDown={onEditModeKeydownHandler}
            onClick={() => setMode("view")}
            size="icon"
            variant="ghost"
            className="peer hover:dark:bg-red-600"
          >
            <Cross1Icon className="size-5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative">
      <Button
        variant={isActive ? "secondary" : "ghost"}
        onClick={onOpenClick}
        className={cn(
          "w-full justify-start group-hover:text-github-900 peer-hover:bg-github-100 dark:group-hover:bg-github-900 dark:group-hover:text-github-100",
          // isActive && buttonVariants({variant: "secondary", className: "justify-start"}),
        )}
      >
        {file.name}
      </Button>
      <Button onClick={onDeleteClick} size="icon" variant="ghost" className="absolute right-0 hover:dark:bg-red-600">
        <TrashIcon className="size-4" />
      </Button>
      <Button
        onClick={() => setMode("edit")}
        size="icon"
        variant="ghost"
        className="peer absolute right-10 hover:dark:bg-github-600"
      >
        <Pencil1Icon className="size-4" />
      </Button>
    </div>
  );
}

function MenuSheetButton({ children, asChild = false }: { children: React.ReactNode; asChild?: boolean }) {
  return <SheetTrigger asChild={asChild}>{children}</SheetTrigger>;
}

const NO_FILE_ID = -1;
const STORAGE_FILE_ID_KEY = "active-file-id";
const SAVE_ON_CHANGE_DELAY = 350;
const isValidFileId = (id: number) => id > NO_FILE_ID;
// prettier-ignore
const editorHeight = window.innerHeight - (parseInt(getComputedStyle(document.documentElement).fontSize) * 4); // NOTE: 4 is because of min-h-16 (4rem)

const useActiveFileId = create<{
  activeFileId: number;
  setActiveFileId: (id: number) => void;
}>()(
  persist(
    (set) => ({
      activeFileId: NO_FILE_ID,
      setActiveFileId: (id) => set({ activeFileId: id }),
    }),
    { name: STORAGE_FILE_ID_KEY },
  ),
);

const codeMirrorSetup: ComponentProps<typeof CodeMirror>["basicSetup"] = {
  foldGutter: false,
  lineNumbers: false,
};

const codeMirrorExtensions: ComponentProps<typeof CodeMirror>["extensions"] = [markdown()];

// `activeFileId` needs to be in sync between local storage and indexeddb.
// For this to happen we need some initial async checks to run.
// The idea is to spin these checks as soon as possible when the app loads initially.
// Then until we resolve the checks we should show a loading state in the component.
const activeFileId = useActiveFileId.getState().activeFileId;
if (!isValidFileId(activeFileId)) {
  // If there is no active file id, we first check if indeed there are no files in the db.
  // If there are then we should grab the first one from there and set that as the active file id.
  db.getFirstFile().then((file) => {
    if (file) {
      useActiveFileId.setState((prev) => ({ ...prev, activeFileId: file.id }));
    } else {
      // If there are no files in the db then we can create a new file
      db.createFile().then((fileId) => {
        useActiveFileId.setState((prev) => ({ ...prev, activeFileId: fileId }));
      });
    }
  });
} else {
  // If we have a valid file id then we should check if also the file exists in the db just to be sure.
  db.getFile(activeFileId).then((file) => {
    if (!file) {
      // If no file then we just create a new one and set the active file id to that.
      db.createFile().then((fileId) => {
        useActiveFileId.setState((prev) => ({ ...prev, activeFileId: fileId }));
      });
    }
    // If a file exists then we don't need to do anything. useLiveQuery() will take care of fetching the file content.
  });
}

function Body() {
  const { activeFileId } = useActiveFileId();
  const fileContents = useLiveQuery(() => db.getFile(activeFileId), [activeFileId]);
  const [loadingFile, setLoadingFile] = useState(isValidFileId(activeFileId) || !fileContents);
  const [md, setMd] = useState({
    content: "",
    // TODO: `shouldSave` is a little misleading. It's used to prevent initial overwriting when we haven't gotten any file content yet.
    shouldSave: false,
  });

  useEffect(() => {
    if (isValidFileId(activeFileId) && fileContents) {
      setLoadingFile(false);
      setMd({ content: fileContents.content, shouldSave: true });
    }
  }, [activeFileId, fileContents]);

  const onMdChange = (val: string) => setMd({ content: val, shouldSave: true });

  useDebouncedEffect(
    async () => {
      if (md.shouldSave) {
        await db.updateFileContent(activeFileId, md.content);
      }
    },
    [md],
    SAVE_ON_CHANGE_DELAY,
  );

  // if (loadingFile) return <div>Loading...</div>;

  return (
    <ResizablePanelGroup direction="horizontal" autoSaveId="resizer-save">
      <ResizablePanel defaultSize={50} minSize={15} className="h-[calc(100svh-4rem)]">
        <CodeMirror
          className="bg-github-950 p-4 text-base"
          height={`${editorHeight}px`}
          maxHeight={`${editorHeight}px`}
          theme={githubDark}
          value={md.content}
          autoFocus
          onChange={onMdChange}
          extensions={codeMirrorExtensions}
          basicSetup={codeMirrorSetup}
        />
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={50} minSize={15} className="h-[calc(100svh-4rem)]">
        <MarkdownPreview className="h-full overflow-auto px-8 py-4 text-base" source={md.content} />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
