import {
    CancellationToken,
    CompletionItem,
    CompletionItemKind,
    CompletionItemProvider,
    SnippetString,
    Position,
    Range,
    TextDocument,
} from 'vscode';

import Client from './client';

export class CompletionProvider implements CompletionItemProvider {

    language: string;

    constructor(language: string) {
        this.language = language;
    }

    private itemTypeToCompletionItemKind(inType: string) : CompletionItemKind
    {
        switch(inType){
            case 'Property':
                return CompletionItemKind.Property;
            case 'Event':
                return CompletionItemKind.Event;
            case 'Namespace':
                return CompletionItemKind.Module;
            default:
                return CompletionItemKind.Class;
        }
    }

    private suggestionToCompletionItem(suggestionItem) : CompletionItem
    {
        const kind = this.itemTypeToCompletionItemKind(suggestionItem.Type);
        const out = new CompletionItem(suggestionItem.Suggestion, kind);
        out.detail = suggestionItem.Type;
        if(kind==CompletionItemKind.Property)
        {
            out.insertText = new SnippetString(out.label+'="$1"');
        }
        return out;
    }

    public provideCompletionItems(
        document: TextDocument,
        position: Position,
        token: CancellationToken) : Promise<CompletionItem[]> {
        return new Promise((resolve, reject) => {
            const filename = document.fileName;

            if (position.character <= 0) {
                return resolve([]);
            }

            const source = document.getText();

            return resolve(Client.Instance.sendRequest({
                "Name": "Fuse.GetCodeSuggestions",
                "Arguments":
                {
                    "SyntaxType": this.language,
                    "Path": document.fileName,
                    "Text": source,
                    "CaretPosition": { "Line": 1 + position.line, "Character": 1 + position.character }
                }
            }).then((payload) => {
                if (payload.Status === 'Success') {
                    const result = payload.Result;

                    if (result.IsUpdatingCache) {
                        return [];
                    }

                    return result.CodeSuggestions.map(item => this.suggestionToCompletionItem(item));
                }

                return [];
            }));
        });
    }
}