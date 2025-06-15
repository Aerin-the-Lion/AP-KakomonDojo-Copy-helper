// ==UserScript==
// @name         AP-KakomonDojo-Copy-helper
// @namespace    http://tampermonkey.net/
// @version      4.1
// @description  AP試験過去問道場の問題文と解説をコピー（ロールバック修正版）
// @author       Aerin-the-Lion
// @match        https://www.ap-siken.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 通知表示
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 10px 20px;
            background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
            color: white;
            border-radius: 4px;
            z-index: 10000;
            font-family: Arial, sans-serif;
            font-size: 14px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 3000);
    }

    // クリップボードコピー
    async function copyToClipboard(text) {
        if (!text || text.trim() === '') {
            showNotification('コピーするテキストがありません', 'error');
            return;
        }

        try {
            await navigator.clipboard.writeText(text);
            showNotification(`コピーしました！ (${text.length}文字)`, 'success');
        } catch (err) {
            // フォールバック
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.cssText = 'position:fixed;left:-999999px;top:-999999px;';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            try {
                const success = document.execCommand('copy');
                document.body.removeChild(textArea);
                if (success) {
                    showNotification(`コピーしました！ (${text.length}文字)`, 'success');
                } else {
                    showNotification('コピーに失敗しました', 'error');
                }
            } catch (fallbackErr) {
                document.body.removeChild(textArea);
                showNotification('コピー機能が利用できません', 'error');
            }
        }
    }

    // 問題文と選択肢をコピー（v3.1の完璧だった機能を復元）
    function copyQuestionAndChoices() {
        let content = '';

        // 問題番号を取得: <h3 class="qno">第2問</h3>
        const questionNumber = document.querySelector('h3.qno');
        if (questionNumber) {
            content += questionNumber.textContent.trim() + '\n';
        }

        // 問題文を取得: h3.qnoの直後のdiv
        const questionText = document.querySelector('h3.qno + div');
        if (questionText) {
            content += questionText.textContent.trim() + '\n\n';
        }

        // 選択肢を取得: .selectList li
        const choices = document.querySelectorAll('.selectList li');
        if (choices.length > 0) {
            choices.forEach(choice => {
                const choiceText = choice.textContent.trim();
                if (choiceText && choiceText.length > 1) {
                    content += choiceText + '\n';
                }
            });
        }

        if (content.trim()) {
            copyToClipboard(content.trim());
        } else {
            showNotification('問題文が見つかりませんでした', 'error');
        }
    }

    // 解説をコピー（v3.1の動作していた機能を復元）
    function copyExplanation() {
        console.log('解説コピー開始');
        
        // 解説が非表示の場合、表示ボタンをクリック
        const kaisetsuDiv = document.getElementById('kaisetsu');
        if (kaisetsuDiv && kaisetsuDiv.classList.contains('displayNone')) {
            console.log('解説が非表示のため、表示ボタンをクリック');
            const showAnswerBtn = document.getElementById('showAnswerBtn');
            if (showAnswerBtn) {
                showAnswerBtn.click();
                // 待機時間を増やし、コールバックを使用
                setTimeout(() => {
                    console.log('解説表示後、再実行');
                    copyExplanationContent();
                }, 1500);
                return;
            }
        }

        copyExplanationContent();
    }

    // 解説コンテンツを実際にコピーする関数（v3.1の動作していた機能を復元）
    function copyExplanationContent() {
        let content = '';
        
        // 複数のセレクタを順番に試行（元のコードの柔軟性を復活）
        const selectors = [
            '.ansbg.R3tfxFm5',           // 特定のクラス
            '#kaisetsu .ansbg',          // 一般的なansbgクラス
            '.ansbg',                    // ansbgクラス全般
            '.explanation',              // 解説クラス
            '.kaisetsu',                 // 解説クラス
            '.answer-explanation',       // 答え解説クラス
            '[class*="explanation"]',    // 解説を含むクラス
            '[class*="kaisetsu"]'        // 解説を含むクラス
        ];

        // セレクタを順番に試行
        for (let selector of selectors) {
            const element = document.querySelector(selector);
            if (element && element.textContent.trim()) {
                content = element.textContent.trim();
                console.log(`解説をセレクタ "${selector}" で取得: ${content.substring(0, 50)}...`);
                break;
            }
        }
        
        // フォールバック: kaisetsu div全体から取得
        if (!content) {
            const kaisetsuDiv = document.getElementById('kaisetsu');
            if (kaisetsuDiv && !kaisetsuDiv.classList.contains('displayNone')) {
                const fullText = kaisetsuDiv.textContent.trim();
                content = fullText.replace(/^解説\s*/, '').trim();
                console.log('フォールバック: kaisetsu div全体から取得');
            }
        }

        // さらなるフォールバック: 解説っぽいテキストを探す
        if (!content) {
            const bodyText = document.body.textContent;
            const explanationMatch = bodyText.match(/解説[：:]\s*(.*?)(?=問\d+|$)/s) || 
                                   bodyText.match(/答え[：:]\s*(.*?)(?=問\d+|$)/s) ||
                                   bodyText.match(/正答[：:]\s*(.*?)(?=問\d+|$)/s);
            if (explanationMatch && explanationMatch[1]) {
                content = explanationMatch[1].trim();
                console.log('テキストパターンマッチングで取得');
            }
        }

        // デバッグ情報をコンソールに出力
        console.log('解説デバッグ情報:', {
            kaisetsuDiv: !!document.getElementById('kaisetsu'),
            isHidden: document.getElementById('kaisetsu')?.classList.contains('displayNone'),
            ansbgR3tfxFm5: !!document.querySelector('.ansbg.R3tfxFm5'),
            ansbgGeneral: !!document.querySelector('#kaisetsu .ansbg'),
            ansbgAny: !!document.querySelector('.ansbg'),
            contentLength: content?.length,
            contentPreview: content?.substring(0, 100)
        });

        if (content && content.length > 10) {
            copyToClipboard(content);
        } else {
            showNotification('解説が見つかりませんでした。コンソールでデバッグ情報を確認してください。', 'error');
        }
    }

    // ボタンを作成（v4.0の完璧だった配置を維持）
    function createButtons() {
        // 既存のボタンを削除
        const existing = document.getElementById('copy-helper-buttons');
        if (existing) {
            existing.remove();
        }
        
        // ボタンコンテナを作成（v4.0の位置を使用）
        const container = document.createElement('div');
        container.id = 'copy-helper-buttons';
        container.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 5px;
            background: rgba(255, 255, 255, 0.9);
            padding: 10px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        `;
        
        // 問題文コピーボタン
        const questionBtn = document.createElement('button');
        questionBtn.textContent = '📝 問題文コピー';
        questionBtn.style.cssText = `
            padding: 8px 12px;
            background: #2196F3;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.2s;
            min-width: 120px;
        `;
        questionBtn.addEventListener('click', copyQuestionAndChoices);
        questionBtn.addEventListener('mouseenter', () => {
            questionBtn.style.backgroundColor = '#1976D2';
            questionBtn.style.transform = 'scale(1.05)';
        });
        questionBtn.addEventListener('mouseleave', () => {
            questionBtn.style.backgroundColor = '#2196F3';
            questionBtn.style.transform = 'scale(1)';
        });
        
        // 解説コピーボタン
        const explanationBtn = document.createElement('button');
        explanationBtn.textContent = '💡 解説コピー';
        explanationBtn.style.cssText = `
            padding: 8px 12px;
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.2s;
            min-width: 120px;
        `;
        explanationBtn.addEventListener('click', copyExplanation);
        explanationBtn.addEventListener('mouseenter', () => {
            explanationBtn.style.backgroundColor = '#388E3C';
            explanationBtn.style.transform = 'scale(1.05)';
        });
        explanationBtn.addEventListener('mouseleave', () => {
            explanationBtn.style.backgroundColor = '#4CAF50';
            explanationBtn.style.transform = 'scale(1)';
        });
        
        container.appendChild(questionBtn);
        container.appendChild(explanationBtn);
        document.body.appendChild(container);
        
        console.log('ボタン作成完了');
    }

    // 問題ページかどうかを判定（簡易版）
    function isQuestionPage() {
        // 基本的にAP試験サイトの全ページで表示（ユーザーが使いたい時に使える）
        return true;
    }

    // 初期化
    function init() {
        console.log('AP-KakomonDojo-Copy-helper v4.1 初期化開始（ロールバック版）');
        
        const checkAndCreate = () => {
            if (isQuestionPage()) {
                console.log('ボタンを作成');
                createButtons();
            }
        };
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(checkAndCreate, 1000);
            });
        } else {
            setTimeout(checkAndCreate, 1000);
        }
        
        // URL変更時にも対応（SPA対応）
        let currentUrl = location.href;
        const observer = new MutationObserver(() => {
            if (location.href !== currentUrl) {
                currentUrl = location.href;
                setTimeout(checkAndCreate, 1000);
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    init();

})();