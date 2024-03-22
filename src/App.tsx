import { ComponentProps } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import MarkdownPreview from "@uiw/react-markdown-preview";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "./components/ui/resizable";
import { githubDark } from "@uiw/codemirror-theme-github";
import { create } from "zustand";
import { persist } from "zustand/middleware";

const rootStyle = getComputedStyle(document.documentElement);
// prettier-ignore
const editorHeight = window.innerHeight - (parseInt(rootStyle.fontSize) * 4);

type MdStore = {
  md: string;
  setMd: (val: string) => void;
};

const initMarkdown = "# Markdown Editor\n\nWrite your markdown here.";

const useMdStore = create<MdStore>()(
  persist(
    (set) => ({
      md: initMarkdown,
      setMd: (val) => set({ md: val }),
    }),
    { name: "md-editor" },
  ),
);

const codeMirrorSetup: ComponentProps<typeof CodeMirror>["basicSetup"] = {
  foldGutter: false,
  lineNumbers: false,
};

const codeMirrorExtensions: ComponentProps<typeof CodeMirror>["extensions"] = [markdown()];

function App() {
  const [md, setMd] = useMdStore((state) => [state.md, state.setMd]);

  const onMdChange = (val: string) => setMd(val);

  return (
    <div>
      <div className="flex min-h-16 items-center px-4">
        <h2 className="text-xl font-semibold tracking-widest">MARKDOWN</h2>
      </div>
      <ResizablePanelGroup direction="horizontal" autoSaveId="resizer-save">
        <ResizablePanel defaultSize={50} minSize={15} className="h-[calc(100svh-4rem)]">
          <CodeMirror
            className="bg-github-950 p-4 text-base"
            height={`${editorHeight}px`}
            maxHeight={`${editorHeight}px`}
            theme={githubDark}
            value={md}
            autoFocus
            onChange={onMdChange}
            extensions={codeMirrorExtensions}
            basicSetup={codeMirrorSetup}
          />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={50} minSize={15} className="h-[calc(100svh-4rem)]">
          <MarkdownPreview className="h-full overflow-auto px-8 py-4 text-base" source={md} />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

export default App;
