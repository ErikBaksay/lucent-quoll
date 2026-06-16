import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { Editor } from '@tiptap/core';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import { TextStyle } from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import StarterKit from '@tiptap/starter-kit';

@Component({
  selector: 'app-rich-text-editor',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rich-text-editor.component.html',
  styleUrl: './rich-text-editor.component.scss',
})
export class RichTextEditorComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input({ required: true }) content: Record<string, unknown> | null = null;
  @Input() compact = false;
  @Input() disabled = false;
  @Input() toolbarVisible = true;
  @Input() preview = false;
  @Output() readonly contentChange = new EventEmitter<Record<string, unknown>>();

  @ViewChild('editorHost', { static: true }) editorHost?: ElementRef<HTMLElement>;

  protected editor: Editor | null = null;
  protected readonly palette = ['#1a1614', '#574636', '#8f6d4a', '#b66a3f'];

  private isApplyingExternalContent = false;

  ngAfterViewInit(): void {
    this.editor = new Editor({
      element: this.editorHost?.nativeElement,
      extensions: [
        StarterKit.configure({
          heading: {
            levels: [1, 2, 3],
          },
        }),
        Underline,
        TextStyle,
        Color,
        Highlight.configure({
          multicolor: true,
        }),
        Link.configure({
          openOnClick: false,
        }),
      ],
      editable: !this.disabled && !this.preview,
      content: this.content ?? { type: 'doc', content: [{ type: 'paragraph' }] },
      onUpdate: ({ editor }) => {
        if (!this.isApplyingExternalContent && !this.preview) {
          this.contentChange.emit(editor.getJSON());
        }
      },
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.editor) {
      return;
    }

    if (changes['disabled'] || changes['preview']) {
      this.editor.setEditable(!this.disabled && !this.preview);
    }

    if (!changes['content']) {
      return;
    }

    const nextContent = this.content ?? { type: 'doc', content: [{ type: 'paragraph' }] };
    if (JSON.stringify(nextContent) === JSON.stringify(this.editor.getJSON())) {
      return;
    }

    this.isApplyingExternalContent = true;
    this.editor.commands.setContent(nextContent, { emitUpdate: false });
    this.isApplyingExternalContent = false;
  }

  ngOnDestroy(): void {
    this.editor?.destroy();
  }

  protected run(command: () => boolean): void {
    if (this.disabled || !this.editor) {
      return;
    }

    command();
  }

  protected toggleBold(): void {
    this.run(() => this.editor!.chain().focus().toggleBold().run());
  }

  protected toggleItalic(): void {
    this.run(() => this.editor!.chain().focus().toggleItalic().run());
  }

  protected toggleUnderline(): void {
    this.run(() => this.editor!.chain().focus().toggleUnderline().run());
  }

  protected toggleBulletList(): void {
    this.run(() => this.editor!.chain().focus().toggleBulletList().run());
  }

  protected toggleHeading(level: 1 | 2 | 3): void {
    this.run(() => this.editor!.chain().focus().toggleHeading({ level }).run());
  }

  protected applyHighlight(): void {
    this.run(() => this.editor!.chain().focus().toggleHighlight({ color: '#f5e0b6' }).run());
  }

  protected addLink(): void {
    const href = window.prompt('Link URL');
    if (!href) {
      return;
    }
    this.run(() => this.editor!.chain().focus().setLink({ href }).run());
  }

  protected applyColor(color: string): void {
    this.run(() => this.editor!.chain().focus().setColor(color).run());
  }

  protected isActive(name: string, attrs?: Record<string, unknown>): boolean {
    return this.editor?.isActive(name, attrs) ?? false;
  }
}
