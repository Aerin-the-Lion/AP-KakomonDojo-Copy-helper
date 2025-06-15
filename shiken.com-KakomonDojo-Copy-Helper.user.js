// ==UserScript==
// @name         shiken.com-KakomonDojo-Copy-Helper
// @namespace    http://tampermonkey.net/
// @version      1.1.0
// @description  Copy questions and explanations from JP IT certification exam practice sites (Kakomon-Dojo) with proper formatting
// @author       Aerin-the-Lion
// @match        https://www.ap-siken.com/*
// @match        https://www.fe-siken.com/*
// @match        https://www.itpassportsiken.com/*
// @match        https://www.sg-siken.com/*
// @match        https://www.db-siken.com/*
// @grant        none
// @license      MIT
// @homepage     https://github.com/Aerin-the-Lion/shiken.com-KakomonDojo-Copy-Helper
// @supportURL   https://github.com/Aerin-the-Lion/shiken.com-KakomonDojo-Copy-Helper/issues
// ==/UserScript==

/**
 * shiken.com-KakomonDojo-Copy-Helper
 * 情報処理技術者試験過去問道場コピーヘルパー
 * 
 * A Tampermonkey userscript that enhances the Japanese IT certification exam 
 * practice sites (*-siken.com) by adding copy functionality for questions 
 * and explanations with proper formatting.
 * 
 * 情報処理技術者試験過去問道場サイト群（*-siken.com）に問題文と解説のコピー機能を追加し、
 * 適切なフォーマットで出力するTampermonkeyユーザースクリプトです。
 * 
 * Supported Sites / 対応サイト:
 * - AP (応用情報技術者試験): ap-siken.com
 * - FE (基本情報技術者試験): fe-siken.com
 * - IP (ITパスポート): itpassportsiken.com
 * - SG (情報セキュリティマネジメント): sg-siken.com
 * - DB (データベーススペシャリスト): db-siken.com
 * 
 * Features / 機能:
 * - Copy questions with proper formatting including section labels
 *   問題文を適切なフォーマット（セクションラベル付き）でコピー
 * - Copy explanations with preserved paragraph structure
 *   段落構造を保持した解説のコピー
 * - Automatic image URL extraction and inclusion for all sections
 *   全セクションでの画像URLの自動抽出と含有
 * - Support for choice formatting (ア → ア. )
 *   選択肢フォーマット対応（ア → ア. ）
 * - Exam session information extraction with line break support
 *   試験セッション情報の抽出（改行対応）
 * 
 * @author Aerin-the-Lion
 * @version 1.1.0
 * @license MIT
 */

(function() {
    'use strict';

    /**
     * Display notification to user
     * ユーザーに通知を表示
     * @param {string} message - Message to display / 表示するメッセージ
     * @param {string} type - Notification type ('info', 'success', 'error') / 通知タイプ
     */
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

        // Auto-remove notification after 3 seconds
        // 3秒後に通知を自動削除
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 3000);
    }

    /**
     * Copy text to clipboard with fallback support
     * フォールバック対応でテキストをクリップボードにコピー
     * @param {string} text - Text to copy to clipboard / クリップボードにコピーするテキスト
     */
    async function copyToClipboard(text) {
        if (!text || text.trim() === '') {
            showNotification('コピーするテキストがありません', 'error');
            return;
        }

        try {
            // Modern clipboard API / モダンクリップボードAPI
            await navigator.clipboard.writeText(text);
            showNotification(`コピーしました！ (${text.length}文字)`, 'success');
        } catch (err) {
            // Fallback for older browsers / 古いブラウザ向けフォールバック
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

    /**
     * Format choice options by adding periods after Japanese characters
     * 日本語文字の後にピリオドを追加して選択肢をフォーマット
     * @param {Array<string>} choices - Array of choice strings / 選択肢文字列の配列
     * @param {Array<Array<string>>} choiceImageUrls - Array of image URL arrays for each choice / 各選択肢の画像URL配列
     * @returns {Array<string>} Formatted choices / フォーマット済み選択肢
     */
    function formatChoices(choices, choiceImageUrls = []) {
        return choices.map((choice, index) => {
            let formattedChoice = choice.trim();
            // Add ". " after Japanese choice indicators (ア、イ、ウ、エ, etc.)
            // 日本語選択肢記号（ア、イ、ウ、エなど）の後に". "を追加
            formattedChoice = formattedChoice.replace(/^([アイウエオカキクケコ])\s*(?!\.)/g, '$1. ');
            
            // Add image URLs for this choice if present / この選択肢の画像URLがあれば追加
            if (choiceImageUrls[index] && choiceImageUrls[index].length > 0) {
                formattedChoice += '\n';
                choiceImageUrls[index].forEach(url => {
                    formattedChoice += url + '\n';
                });
                formattedChoice = formattedChoice.trim(); // Remove trailing newline
            }
            
            return formattedChoice;
        });
    }

    /**
     * Convert relative path to absolute URL
     * 相対パスを絶対URLに変換
     * @param {string} relativePath - Relative path to convert / 変換する相対パス
     * @returns {string} Absolute URL / 絶対URL
     */
    function convertToAbsoluteUrl(relativePath) {
        const currentUrl = window.location.href;
        const baseUrl = currentUrl.substring(0, currentUrl.lastIndexOf('/'));
        
        // Handle img/ prefixed paths / img/プレフィックス付きパスの処理
        if (relativePath.startsWith('img/')) {
            return baseUrl + '/' + relativePath;
        }
        
        // Handle relative paths starting with ./ / ./で始まる相対パスの処理
        if (relativePath.startsWith('./')) {
            return baseUrl + '/' + relativePath.substring(2);
        }
        
        // Return as-is for absolute paths or full URLs / 絶対パスまたは完全URLはそのまま返す
        if (relativePath.startsWith('http') || relativePath.startsWith('/')) {
            return relativePath;
        }
        
        // Default case: combine with base URL / デフォルト: ベースURLと結合
        return baseUrl + '/' + relativePath;
    }

    /**
     * Extract image URLs from any element
     * 任意の要素から画像URLを抽出
     * @param {HTMLElement} element - DOM element to extract images from / 画像を抽出するDOM要素
     * @returns {Array<string>} Array of absolute image URLs / 絶対画像URLの配列
     */
    function extractImageUrls(element) {
        const imageUrls = [];
        
        if (!element) return imageUrls;
        
        const imgElements = element.querySelectorAll('img');
        
        imgElements.forEach(img => {
            const src = img.getAttribute('src');
            if (src) {
                const absoluteUrl = convertToAbsoluteUrl(src);
                imageUrls.push(absoluteUrl);
                console.log(`Image URL detected: ${src} → ${absoluteUrl}`);
            }
        });
        
        return imageUrls;
    }

    /**
     * Extract exam session information from anslink element with line break support
     * anslink要素から試験セッション情報を抽出（改行対応）
     * @returns {string} Formatted exam session info or empty string / フォーマット済み試験セッション情報または空文字列
     */
    function extractExamSessionInfo() {
        const anslinkElement = document.querySelector('.anslink');
        if (anslinkElement) {
            // Get innerHTML to preserve <br> tags / <br>タグを保持するためinnerHTMLを取得
            let sessionHtml = anslinkElement.innerHTML.trim();
            
            if (sessionHtml) {
                // Convert <br> tags to line breaks / <br>タグを改行に変換
                let sessionInfo = sessionHtml
                    .replace(/<br\s*\/?>/gi, '\n')
                    // Remove any remaining HTML tags / 残りのHTMLタグを削除
                    .replace(/<[^>]*>/g, '')
                    // Decode HTML entities / HTMLエンティティをデコード
                    .replace(/&nbsp;/g, ' ')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&amp;/g, '&')
                    .replace(/&quot;/g, '"')
                    .replace(/&#39;/g, "'")
                    .trim();
                
                console.log(`Exam session info detected: ${sessionInfo}`);
                return sessionInfo;
            }
        }
        return '';
    }

    /**
     * Copy formatted question text and choices to clipboard
     * フォーマット済み問題文と選択肢をクリップボードにコピー
     */
    function copyQuestionAndChoices() {
        let content = '';

        // Add section label / セクションラベルを追加
        content += '【問題文】\n';

        // Extract question number from h3.qno element / h3.qno要素から問題番号を抽出
        const questionNumber = document.querySelector('h3.qno');
        if (questionNumber) {
            content += questionNumber.textContent.trim() + '\n';
        }

        // Extract question text from either h3.qno + div or #mondai
        // h3.qno + divまたは#mondaiから問題文を抽出
        let questionElement = document.querySelector('h3.qno + div');
        if (!questionElement) {
            questionElement = document.querySelector('#mondai');
        }
        
        let questionText = '';
        let imageUrls = [];
        
        if (questionElement) {
            // Extract image URLs before removing img elements
            // img要素を削除する前に画像URLを抽出
            imageUrls = extractImageUrls(questionElement);
            
            // Get question text with img tags removed
            // imgタグを削除した問題文を取得
            const tempDiv = questionElement.cloneNode(true);
            const imgElements = tempDiv.querySelectorAll('img');
            imgElements.forEach(img => img.remove());
            
            questionText = tempDiv.textContent.trim();
            content += questionText;
            
            // Add image URLs if present / 画像URLがあれば追加
            if (imageUrls.length > 0) {
                content += '\n';
                imageUrls.forEach(url => {
                    content += url + '\n';
                });
            }
            
            // Extract and add exam session information / 試験セッション情報を抽出して追加
            const sessionInfo = extractExamSessionInfo();
            if (sessionInfo) {
                content += '\n' + sessionInfo;
            }
            
            content += '\n';
        }

        // Add choices section / 選択肢セクションを追加
        content += '【選択肢】\n';

        // Extract choices from .selectList li elements with image support
        // .selectList li要素から選択肢を抽出（画像対応）
        const choices = document.querySelectorAll('.selectList li');
        if (choices.length > 0) {
            const choiceTexts = [];
            const choiceImageUrls = [];
            
            choices.forEach(choice => {
                // Extract text content / テキストコンテンツを抽出
                const tempDiv = choice.cloneNode(true);
                const imgElements = tempDiv.querySelectorAll('img');
                imgElements.forEach(img => img.remove());
                
                const choiceText = tempDiv.textContent.trim();
                if (choiceText && choiceText.length > 1) {
                    choiceTexts.push(choiceText);
                    
                    // Extract image URLs for this choice / この選択肢の画像URLを抽出
                    const choiceImages = extractImageUrls(choice);
                    choiceImageUrls.push(choiceImages);
                }
            });
            
            // Format choices with proper punctuation and image URLs
            // 適切な句読点と画像URLで選択肢をフォーマット
            const formattedChoices = formatChoices(choiceTexts, choiceImageUrls);
            content += formattedChoices.join('\n') + '\n';
        }

        if (content.trim()) {
            copyToClipboard(content.trim());
            
            // Log debug information / デバッグ情報をログ出力
            console.log('Question copy completed:', {
                questionFound: !!questionElement,
                imageCount: imageUrls.length,
                imageUrls: imageUrls,
                contentLength: content.length
            });
        } else {
            showNotification('問題文が見つかりませんでした', 'error');
        }
    }

    /**
     * Extract formatted text from HTML element while preserving structure and images
     * 構造と画像を保持しながらHTML要素からフォーマット済みテキストを抽出
     * @param {HTMLElement} element - DOM element to extract text from / テキストを抽出するDOM要素
     * @returns {string} Formatted text with preserved structure and image URLs / 構造と画像URLを保持したフォーマット済みテキスト
     */
    function extractExplanationText(element) {
        if (!element) return '';
        
        // First extract all image URLs before processing HTML / HTML処理前にすべての画像URLを抽出
        const imageUrls = extractImageUrls(element);
        
        let html = element.innerHTML;
        
        // Remove unnecessary script and style tags / 不要なscriptとstyleタグを削除
        html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
        html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
        
        // Process HTML structure for proper formatting / 適切なフォーマットのためHTML構造を処理
        
        // Add line breaks around dl elements / dl要素の前後に改行を追加
        html = html.replace(/<dl[^>]*>/gi, '\n<dl>');
        html = html.replace(/<\/dl>/gi, '</dl>\n');
        
        // Process dt elements (definition terms) with line breaks / dt要素（定義用語）に改行を追加
        html = html.replace(/<dt[^>]*>(.*?)<\/dt>/gi, '\n$1\n');
        
        // Process dd elements (definition descriptions) / dd要素（定義説明）を処理
        html = html.replace(/<dd[^>]*>(.*?)<\/dd>/gi, '$1\n');
        
        // Convert br tags to line breaks / brタグを改行に変換
        html = html.replace(/<br\s*\/?>/gi, '\n');
        
        // Convert block element endings to line breaks / ブロック要素の終了を改行に変換
        html = html.replace(/<\/(div|p|h[1-6]|li|ol|ul|blockquote)>/gi, '\n');
        
        // Remove all remaining HTML tags / 残りのHTMLタグをすべて削除
        html = html.replace(/<[^>]*>/g, '');
        
        // Decode HTML entities / HTMLエンティティをデコード
        let text = html
            .replace(/&nbsp;/g, ' ')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'");
        
        // Clean up formatting / フォーマットをクリーンアップ
        text = text
            // Normalize consecutive spaces / 連続するスペースを正規化
            .replace(/[ \t]+/g, ' ')
            // Remove leading/trailing spaces from lines / 行の先頭・末尾のスペースを削除
            .replace(/^[ \t]+|[ \t]+$/gm, '')
            // Limit consecutive line breaks to maximum of 2 / 連続する改行を最大2つに制限
            .replace(/\n{3,}/g, '\n\n')
            // Trim leading/trailing whitespace / 先頭・末尾の空白をトリム
            .trim();
        
        // Add image URLs at the end if present / 画像URLがあれば最後に追加
        if (imageUrls.length > 0) {
            text += '\n\n';
            imageUrls.forEach(url => {
                text += url + '\n';
            });
            text = text.trim(); // Remove trailing newline
        }
        
        return text;
    }

    /**
     * Copy formatted explanation to clipboard
     * フォーマット済み解説をクリップボードにコピー
     */
    function copyExplanation() {
        console.log('Starting explanation copy process');
        
        // Check if explanation is hidden and show it if necessary
        // 解説が非表示かどうかをチェックし、必要に応じて表示
        const kaisetsuDiv = document.getElementById('kaisetsu');
        if (kaisetsuDiv && kaisetsuDiv.classList.contains('displayNone')) {
            console.log('Explanation is hidden, clicking show button');
            const showAnswerBtn = document.getElementById('showAnswerBtn');
            if (showAnswerBtn) {
                showAnswerBtn.click();
                // Wait for content to load, then retry / コンテンツの読み込みを待ってから再試行
                setTimeout(() => {
                    console.log('Retrying explanation copy after showing');
                    copyExplanationContent();
                }, 1500);
                return;
            }
        }

        copyExplanationContent();
    }

    /**
     * Extract and copy explanation content with image support
     * 画像対応で解説コンテンツを抽出してコピー
     */
    function copyExplanationContent() {
        let content = '';
        
        // Add section label / セクションラベルを追加
        content += '【解説】\n';
        
        // Try multiple selectors in order of preference / 優先順位に従って複数のセレクタを試行
        const selectors = [
            '.ansbg.R3tfxFm5',           // Specific class combination / 特定のクラス組み合わせ
            '#kaisetsu .ansbg',          // General ansbg class within kaisetsu / kaisetsu内の一般的なansbgクラス
            '.ansbg',                    // Any ansbg class / 任意のansbgクラス
            '.explanation',              // Explanation class / 解説クラス
            '.kaisetsu',                 // Kaisetsu class / 解説クラス
            '.answer-explanation',       // Answer explanation class / 答え解説クラス
            '[class*="explanation"]',    // Any class containing "explanation" / "explanation"を含む任意のクラス
            '[class*="kaisetsu"]'        // Any class containing "kaisetsu" / "kaisetsu"を含む任意のクラス
        ];

        let explanationElement = null;
        
        // Find explanation element using selectors / セレクタを使用して解説要素を検索
        for (let selector of selectors) {
            const element = document.querySelector(selector);
            if (element && (element.textContent || element.innerText)) {
                explanationElement = element;
                console.log(`Explanation element found using selector: "${selector}"`);
                break;
            }
        }
        
        if (explanationElement) {
            // Extract formatted text while preserving structure and images
            // 構造と画像を保持しながらフォーマット済みテキストを抽出
            const explanationText = extractExplanationText(explanationElement);
            content += explanationText;
        }
        
        // Fallback: try kaisetsu div directly / フォールバック: kaisetsu divを直接試行
        if (!explanationElement || content.length < 50) {
            const kaisetsuDiv = document.getElementById('kaisetsu');
            if (kaisetsuDiv && !kaisetsuDiv.classList.contains('displayNone')) {
                const explanationText = extractExplanationText(kaisetsuDiv);
                content = '【解説】\n' + explanationText;
                console.log('Fallback: using entire kaisetsu div');
            }
        }

        // Final fallback: pattern matching in body text / 最終フォールバック: ボディテキストでのパターンマッチング
        if (content.length < 50) {
            const bodyText = document.body.textContent;
            const explanationMatch = bodyText.match(/解説[：:]\s*(.*?)(?=問\d+|$)/s) || 
                                   bodyText.match(/答え[：:]\s*(.*?)(?=問\d+|$)/s) ||
                                   bodyText.match(/正答[：:]\s*(.*?)(?=問\d+|$)/s);
            if (explanationMatch && explanationMatch[1]) {
                content = '【解説】\n' + explanationMatch[1].trim();
                console.log('Final fallback: text pattern matching');
            }
        }

        // Log debug information / デバッグ情報をログ出力
        console.log('Explanation debug info:', {
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

    /**
     * Create and inject copy buttons into the page
     * コピーボタンを作成してページに注入
     */
    function createButtons() {
        // Remove existing buttons if present / 既存のボタンがあれば削除
        const existing = document.getElementById('copy-helper-buttons');
        if (existing) {
            existing.remove();
        }
        
        // Create button container / ボタンコンテナを作成
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
        
        // Create question copy button / 問題文コピーボタンを作成
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
        
        // Add event listeners for question button / 問題文ボタンのイベントリスナーを追加
        questionBtn.addEventListener('click', copyQuestionAndChoices);
        questionBtn.addEventListener('mouseenter', () => {
            questionBtn.style.backgroundColor = '#1976D2';
            questionBtn.style.transform = 'scale(1.05)';
        });
        questionBtn.addEventListener('mouseleave', () => {
            questionBtn.style.backgroundColor = '#2196F3';
            questionBtn.style.transform = 'scale(1)';
        });
        
        // Create explanation copy button / 解説コピーボタンを作成
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
        
        // Add event listeners for explanation button / 解説ボタンのイベントリスナーを追加
        explanationBtn.addEventListener('click', copyExplanation);
        explanationBtn.addEventListener('mouseenter', () => {
            explanationBtn.style.backgroundColor = '#388E3C';
            explanationBtn.style.transform = 'scale(1.05)';
        });
        explanationBtn.addEventListener('mouseleave', () => {
            explanationBtn.style.backgroundColor = '#4CAF50';
            explanationBtn.style.transform = 'scale(1)';
        });
        
        // Add buttons to container and inject into page / ボタンをコンテナに追加してページに注入
        container.appendChild(questionBtn);
        container.appendChild(explanationBtn);
        document.body.appendChild(container);
        
        console.log('Copy buttons created successfully');
    }

    /**
     * Check if current page should show the copy buttons
     * 現在のページでコピーボタンを表示すべきかチェック
     * @returns {boolean} Whether to show buttons on this page / このページでボタンを表示するかどうか
     */
    function isQuestionPage() {
        // Show buttons on all supported siken.com pages for maximum flexibility
        // 最大限の柔軟性のためすべての対応siken.comページでボタンを表示
        return true;
    }

    /**
     * Initialize the userscript
     * ユーザースクリプトを初期化
     */
    function init() {
        console.log('shiken.com-KakomonDojo-Copy-Helper v1.1.0 initializing');
        
        const checkAndCreate = () => {
            if (isQuestionPage()) {
                console.log('Creating copy buttons');
                createButtons();
            }
        };
        
        // Handle both loaded and loading states / 読み込み済みと読み込み中の両方の状態を処理
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(checkAndCreate, 1000);
            });
        } else {
            setTimeout(checkAndCreate, 1000);
        }
        
        // Handle SPA navigation by observing URL changes / URL変更を監視してSPAナビゲーションを処理
        let currentUrl = location.href;
        const observer = new MutationObserver(() => {
            if (location.href !== currentUrl) {
                currentUrl = location.href;
                setTimeout(checkAndCreate, 1000);
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    // Start the userscript / ユーザースクリプトを開始
    init();

})();
