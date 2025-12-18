// Firebase Firestore 모듈 임포트
import { collection, addDoc, getDocs, doc, updateDoc, onSnapshot, query, orderBy, Timestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// 질문과 답변 데이터를 저장할 배열
let questions = [];
let openQuestionId = null; // 현재 열려있는 질문 ID
let db = null; // Firebase Firestore 참조

// Firebase 초기화 대기 및 페이지 로드 시 설정
document.addEventListener('DOMContentLoaded', async function() {
    // Firebase 초기화 대기 (window.db가 설정될 때까지)
    await waitForFirebase();
    
    if (db) {
        // Firebase에서 질문 데이터 불러오기
        loadQuestionsFromFirestore();
        
        // 질문 작성 폼 이벤트
        document.getElementById('questionForm').addEventListener('submit', handleQuestionSubmit);
        
        // 필터 이벤트
        document.getElementById('filterSubject').addEventListener('change', displayQuestions);
    } else {
        console.error('Firebase가 초기화되지 않았습니다.');
        document.getElementById('questionsList').innerHTML = `
            <div class="empty-state">
                <h3>⚠️ Firebase 설정이 필요합니다</h3>
                <p>Firebase 연결을 확인해주세요.</p>
            </div>
        `;
    }
});

// Firebase 초기화 대기 함수
function waitForFirebase() {
    return new Promise((resolve) => {
        const checkFirebase = setInterval(() => {
            if (window.db) {
                db = window.db;
                clearInterval(checkFirebase);
                resolve();
            }
        }, 100);
        
        // 최대 5초 대기
        setTimeout(() => {
            clearInterval(checkFirebase);
            resolve();
        }, 5000);
    });
}

// 질문 제출 처리
async function handleQuestionSubmit(e) {
    e.preventDefault();
    
    if (!db) {
        showError('Firebase가 초기화되지 않았습니다. 잠시 후 다시 시도해주세요.');
        return;
    }
    
    const subject = document.getElementById('subject').value.trim();
    const title = document.getElementById('title').value.trim();
    const content = document.getElementById('content').value.trim();
    const author = document.getElementById('author').value.trim();
    
    // 클라이언트 사이드 검증
    if (!subject || !title || !content || !author) {
        showError('모든 항목을 입력해주세요.');
        return;
    }
    
    if (title.length > 200) {
        showError('제목은 200자 이하로 작성해주세요.');
        return;
    }
    
    if (content.length > 5000) {
        showError('내용은 5000자 이하로 작성해주세요.');
        return;
    }
    
    if (author.length > 50) {
        showError('작성자 이름은 50자 이하로 작성해주세요.');
        return;
    }
    
    const question = {
        id: Date.now(),
        subject: subject,
        title: title,
        content: content,
        author: author,
        date: new Date().toLocaleString('ko-KR'),
        timestamp: Timestamp.now(),
        answers: []
    };
    
    // 버튼 비활성화 및 로딩 표시
    const submitButton = e.target.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = '저장 중...';
    
    try {
        // Firestore에 질문 저장
        const questionsRef = collection(db, 'questions');
        const docRef = await addDoc(questionsRef, question);
        
        // 로컬 배열에도 추가
        question.docId = docRef.id;
        questions.push(question);
        
        // 화면 즉시 업데이트
        displayQuestions();
        
        // 폼 초기화
        document.getElementById('questionForm').reset();
        
        // 새로 등록한 질문을 자동으로 열기
        openQuestionId = question.id;
        
        // 질문 목록 다시 표시 (열린 상태로)
        displayQuestions();
        
        showSuccess('질문이 등록되었습니다! ✨');
    } catch (error) {
        console.error('질문 저장 중 오류 발생:', error);
        
        // 오류 타입별 메시지
        let errorMessage = '질문 저장 중 오류가 발생했습니다.';
        
        if (error.code === 'permission-denied') {
            errorMessage = '❌ 권한이 없습니다. Firestore 규칙을 확인해주세요.';
        } else if (error.code === 'unavailable') {
            errorMessage = '❌ 데이터베이스 연결 오류가 발생했습니다.';
        } else if (error.message) {
            errorMessage = `❌ 오류: ${error.message}`;
        }
        
        showError(errorMessage);
    } finally {
        // 버튼 복원
        submitButton.disabled = false;
        submitButton.textContent = originalText;
    }
}

// 질문 목록 표시
function displayQuestions() {
    const questionsList = document.getElementById('questionsList');
    const filterSubject = document.getElementById('filterSubject').value;
    
    // 필터링된 질문 목록
    let filteredQuestions = questions;
    if (filterSubject) {
        filteredQuestions = questions.filter(q => q.subject === filterSubject);
    }
    
    // 최신순으로 정렬
    filteredQuestions.sort((a, b) => b.id - a.id);
    
    if (filteredQuestions.length === 0) {
        questionsList.innerHTML = `
            <div class="empty-state">
                <h3>😊 아직 등록된 질문이 없어요</h3>
                <p>첫 번째 질문을 작성해보세요! 💪</p>
            </div>
        `;
        return;
    }
    
    questionsList.innerHTML = filteredQuestions.map(question => {
        const isOpen = openQuestionId === question.id;
        const subjectEmoji = getSubjectEmoji(question.subject);
        
        return `
        <div class="question-card ${isOpen ? 'open' : ''}">
            <div class="question-summary" onclick="toggleQuestion(${question.id})">
                <div class="question-info">
                    <span class="question-subject">${subjectEmoji} ${question.subject}</span>
                    <h3 class="question-title">${question.title}</h3>
                    <div class="question-meta">
                        <span>👤 ${question.author}</span>
                        <span>📅 ${question.date}</span>
                        <span class="answer-count">💬 답변 ${question.answers ? question.answers.length : 0}개</span>
                    </div>
                </div>
                <div class="toggle-icon">${isOpen ? '▼' : '▶'}</div>
            </div>
            
            <div class="question-detail" style="display: ${isOpen ? 'block' : 'none'}">
                <div class="question-content">${question.content}</div>
                
                <div class="answers-section">
                    <h3>💬 답변 (${question.answers ? question.answers.length : 0}개)</h3>
                    
                    ${(!question.answers || question.answers.length === 0) ? `
                        <div class="no-answers">아직 답변이 없어요. 첫 번째 답변을 작성해보세요! 😊</div>
                    ` : ''}
                    
                    ${question.answers ? question.answers.map(answer => `
                        <div class="answer-card">
                            <div class="answer-header">
                                <span class="answer-author">👤 ${answer.author}</span>
                                <span class="answer-date">📅 ${answer.date}</span>
                            </div>
                            <div class="answer-content">${answer.content}</div>
                        </div>
                    `).join('') : ''}
                    
                    <div class="answer-form">
                        <form onsubmit="handleAnswerSubmit(event, ${question.id}, '${question.docId || ''}')">
                            <div class="answer-form-group">
                                <label for="answerAuthor_${question.id}">👤 답변 작성자:</label>
                                <input type="text" id="answerAuthor_${question.id}" placeholder="이름을 적어주세요" required>
                            </div>
                            <div class="answer-form-group">
                                <label for="answerContent_${question.id}">💭 답변 내용:</label>
                                <textarea id="answerContent_${question.id}" rows="3" placeholder="답변을 적어주세요" required></textarea>
                            </div>
                            <button type="submit">✨ 답변 올리기</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    `;
    }).join('');
}

// 교과목별 이모지 반환
function getSubjectEmoji(subject) {
    const emojiMap = {
        '국어': '📝',
        '수학': '🔢',
        '사회': '🌍',
        '과학': '🔬',
        '영어': '🌐',
        '체육': '⚽',
        '음악': '🎵',
        '미술': '🎨',
        '도덕': '💝',
        '기타': '📚'
    };
    return emojiMap[subject] || '📚';
}

// 질문 열기/닫기 토글 (전역 함수로 내보내기)
window.toggleQuestion = function(questionId) {
    if (openQuestionId === questionId) {
        openQuestionId = null;
    } else {
        openQuestionId = questionId;
    }
    displayQuestions();
}

// 답변 제출 처리 (전역 함수로 내보내기)
window.handleAnswerSubmit = async function(e, questionId, docId) {
    e.preventDefault();
    
    if (!db) {
        showError('Firebase가 초기화되지 않았습니다. 잠시 후 다시 시도해주세요.');
        return;
    }
    
    const question = questions.find(q => q.id === questionId);
    if (!question) {
        showError('질문을 찾을 수 없습니다.');
        return;
    }
    
    // docId가 없으면 question에서 가져오기
    if (!docId && question.docId) {
        docId = question.docId;
    }
    
    if (!docId) {
        showError('질문 정보를 찾을 수 없습니다. 페이지를 새로고침해주세요.');
        console.error('docId를 찾을 수 없음:', question);
        return;
    }
    
    const author = document.getElementById(`answerAuthor_${questionId}`).value.trim();
    const content = document.getElementById(`answerContent_${questionId}`).value.trim();
    
    // 클라이언트 사이드 검증
    if (!author || !content) {
        showError('작성자 이름과 답변 내용을 모두 입력해주세요.');
        return;
    }
    
    if (author.length > 50) {
        showError('작성자 이름은 50자 이하로 작성해주세요.');
        return;
    }
    
    if (content.length > 2000) {
        showError('답변 내용은 2000자 이하로 작성해주세요.');
        return;
    }
    
    const answer = {
        id: Date.now(),
        author: author,
        content: content,
        date: new Date().toLocaleString('ko-KR')
    };
    
    // 버튼 비활성화 및 로딩 표시
    const submitButton = e.target.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = '저장 중...';
    
    try {
        // 기존 답변 배열 가져오기
        if (!question.answers) {
            question.answers = [];
        }
        
        // 답변 추가
        question.answers.push(answer);
        
        // Firestore에 업데이트
        const questionRef = doc(db, 'questions', docId);
        await updateDoc(questionRef, {
            answers: question.answers
        });
        
        // 답변 등록 후에도 해당 질문이 열려있도록 유지
        openQuestionId = questionId;
        displayQuestions();
        
        // 답변 폼 초기화
        document.getElementById(`answerAuthor_${questionId}`).value = '';
        document.getElementById(`answerContent_${questionId}`).value = '';
        
        showSuccess('답변이 등록되었습니다! ✨');
    } catch (error) {
        console.error('답변 저장 중 오류 발생:', error);
        
        // 오류 타입별 메시지
        let errorMessage = '답변 저장 중 오류가 발생했습니다.';
        
        if (error.code === 'permission-denied') {
            errorMessage = '❌ 권한이 없습니다. Firestore 규칙을 확인해주세요.';
        } else if (error.code === 'unavailable') {
            errorMessage = '❌ 데이터베이스 연결 오류가 발생했습니다.';
        } else if (error.message) {
            errorMessage = `❌ 오류: ${error.message}`;
        }
        
        showError(errorMessage);
    } finally {
        // 버튼 복원
        submitButton.disabled = false;
        submitButton.textContent = originalText;
    }
}

// Firestore에서 질문 데이터 불러오기 (실시간 동기화)
function loadQuestionsFromFirestore() {
    // 로딩 표시
    document.getElementById('questionsList').innerHTML = `
        <div class="empty-state">
            <h3>📡 데이터를 불러오는 중...</h3>
            <p>잠시만 기다려주세요.</p>
        </div>
    `;
    
    const questionsRef = collection(db, 'questions');
    
    // 실시간 동기화 (데이터 변경 시 자동 업데이트)
    // orderBy를 사용하면 timestamp가 없으면 오류가 발생할 수 있으므로
    // 처음에는 그냥 전체 조회하고, 데이터가 있으면 timestamp로 정렬
    onSnapshot(questionsRef, (snapshot) => {
        questions = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            data.docId = doc.id; // Firestore 문서 ID 저장
            questions.push(data);
        });
        
        // timestamp가 있으면 timestamp로 정렬, 없으면 id로 정렬 (최신순)
        questions.sort((a, b) => {
            if (a.timestamp && b.timestamp) {
                return b.timestamp.toMillis() - a.timestamp.toMillis();
            }
            return (b.id || 0) - (a.id || 0);
        });
        
        displayQuestions();
    }, (error) => {
        console.error('데이터 불러오기 오류:', error);
        
        let errorMessage = 'Firestore 연결을 확인해주세요.';
        
        if (error.code === 'permission-denied') {
            errorMessage = '❌ 읽기 권한이 없습니다. Firestore 규칙을 확인해주세요.<br><small>규칙에서 allow read: if true로 설정되어 있어야 합니다.</small>';
        } else if (error.code === 'unavailable') {
            errorMessage = '❌ 데이터베이스에 연결할 수 없습니다. 인터넷 연결을 확인해주세요.';
        }
        
        document.getElementById('questionsList').innerHTML = `
            <div class="empty-state">
                <h3>⚠️ 데이터를 불러올 수 없습니다</h3>
                <p>${errorMessage}</p>
            </div>
        `;
    });
}

// 성공 메시지 표시
function showSuccess(message) {
    // 기존 알림 제거
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = 'notification notification-success';
    notification.innerHTML = `<span>${message}</span><button onclick="this.parentElement.remove()">✕</button>`;
    document.body.appendChild(notification);
    
    // 3초 후 자동 제거
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 3000);
}

// 오류 메시지 표시
function showError(message) {
    // 기존 알림 제거
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = 'notification notification-error';
    notification.innerHTML = `<span>${message}</span><button onclick="this.parentElement.remove()">✕</button>`;
    document.body.appendChild(notification);
    
    // 5초 후 자동 제거
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}
