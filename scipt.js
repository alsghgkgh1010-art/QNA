// 질문과 답변 데이터를 저장할 배열
let questions = [];
let openQuestionId = null; // 현재 열려있는 질문 ID

// 페이지 로드 시 저장된 데이터 불러오기
document.addEventListener('DOMContentLoaded', function() {
    loadQuestions();
    displayQuestions();
    
    // 질문 작성 폼 이벤트
    document.getElementById('questionForm').addEventListener('submit', handleQuestionSubmit);
    
    // 필터 이벤트
    document.getElementById('filterSubject').addEventListener('change', displayQuestions);
});

// 질문 제출 처리
function handleQuestionSubmit(e) {
    e.preventDefault();
    
    const subject = document.getElementById('subject').value;
    const title = document.getElementById('title').value;
    const content = document.getElementById('content').value;
    const author = document.getElementById('author').value;
    
    const question = {
        id: Date.now(),
        subject: subject,
        title: title,
        content: content,
        author: author,
        date: new Date().toLocaleString('ko-KR'),
        answers: []
    };
    
    questions.push(question);
    saveQuestions();
    displayQuestions();
    
    // 폼 초기화
    document.getElementById('questionForm').reset();
    
    // 새로 등록한 질문을 자동으로 열기
    openQuestionId = question.id;
    
    alert('질문이 등록되었습니다! ✨');
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
                        <span class="answer-count">💬 답변 ${question.answers.length}개</span>
                    </div>
                </div>
                <div class="toggle-icon">${isOpen ? '▼' : '▶'}</div>
            </div>
            
            <div class="question-detail" style="display: ${isOpen ? 'block' : 'none'}">
                <div class="question-content">${question.content}</div>
                
                <div class="answers-section">
                    <h3>💬 답변 (${question.answers.length}개)</h3>
                    
                    ${question.answers.length === 0 ? `
                        <div class="no-answers">아직 답변이 없어요. 첫 번째 답변을 작성해보세요! 😊</div>
                    ` : ''}
                    
                    ${question.answers.map(answer => `
                        <div class="answer-card">
                            <div class="answer-header">
                                <span class="answer-author">👤 ${answer.author}</span>
                                <span class="answer-date">📅 ${answer.date}</span>
                            </div>
                            <div class="answer-content">${answer.content}</div>
                        </div>
                    `).join('')}
                    
                    <div class="answer-form">
                        <form onsubmit="handleAnswerSubmit(event, ${question.id})">
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

// 질문 열기/닫기 토글
function toggleQuestion(questionId) {
    if (openQuestionId === questionId) {
        openQuestionId = null;
    } else {
        openQuestionId = questionId;
    }
    displayQuestions();
}

// 답변 제출 처리
function handleAnswerSubmit(e, questionId) {
    e.preventDefault();
    
    const question = questions.find(q => q.id === questionId);
    if (!question) return;
    
    const author = document.getElementById(`answerAuthor_${questionId}`).value;
    const content = document.getElementById(`answerContent_${questionId}`).value;
    
    const answer = {
        id: Date.now(),
        author: author,
        content: content,
        date: new Date().toLocaleString('ko-KR')
    };
    
    question.answers.push(answer);
    saveQuestions();
    
    // 답변 등록 후에도 해당 질문이 열려있도록 유지
    openQuestionId = questionId;
    displayQuestions();
    
    // 답변 폼 초기화
    document.getElementById(`answerAuthor_${questionId}`).value = '';
    document.getElementById(`answerContent_${questionId}`).value = '';
    
    alert('답변이 등록되었습니다! ✨');
}

// 로컬 스토리지에 질문 저장
function saveQuestions() {
    localStorage.setItem('questions', JSON.stringify(questions));
}

// 로컬 스토리지에서 질문 불러오기
function loadQuestions() {
    const savedQuestions = localStorage.getItem('questions');
    if (savedQuestions) {
        questions = JSON.parse(savedQuestions);
    }
}

