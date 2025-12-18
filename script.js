import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, collection, addDoc, doc, updateDoc, onSnapshot, query, orderBy, Timestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// 1. Firebase 설정 정보 (사용자님의 키 그대로 유지)
const firebaseConfig = {
    apiKey: "AIzaSyCiFKwIlVMyHTGv6qgokpLEgPT1rrq8p1Y",
    authDomain: "qna-project-df1c5.firebaseapp.com",
    projectId: "qna-project-df1c5",
    storageBucket: "qna-project-df1c5.firebasestorage.app",
    messagingSenderId: "673557991168",
    appId: "1:673557991168:web:882be829d97b279029ade5",
    measurementId: "G-FSZSXG99CP"
};

// 2. Firebase 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let questions = [];
let openQuestionId = null;

// 3. 페이지 로드 시 초기화 및 데이터 불러오기
document.addEventListener('DOMContentLoaded', () => {
    loadQuestionsFromFirestore();
    document.getElementById('questionForm').addEventListener('submit', handleQuestionSubmit);
    document.getElementById('filterSubject').addEventListener('change', displayQuestions);
});

// 질문 등록 함수
async function handleQuestionSubmit(e) {
    e.preventDefault();
    
    const subject = document.getElementById('subject').value;
    const title = document.getElementById('title').value.trim();
    const content = document.getElementById('content').value.trim();
    const author = document.getElementById('author').value.trim();
    
    const submitButton = e.target.querySelector('button[type="submit"]');
    submitButton.disabled = true;

    try {
        const questionData = {
            id: Date.now(),
            subject,
            title,
            content,
            author,
            date: new Date().toLocaleString('ko-KR'),
            timestamp: Timestamp.now(),
            answers: []
        };

        await addDoc(collection(db, 'questions'), questionData);
        e.target.reset();
        alert('질문이 성공적으로 등록되었습니다! ✨');
    } catch (error) {
        console.error("데이터 저장 에러:", error);
        alert('저장 중 오류가 발생했습니다: ' + error.message);
    } finally {
        submitButton.disabled = false;
    }
}

// 질문 목록 렌더링 함수
function displayQuestions() {
    const questionsList = document.getElementById('questionsList');
    const filterSubject = document.getElementById('filterSubject').value;
    
    let filtered = filterSubject ? questions.filter(q => q.subject === filterSubject) : questions;

    if (filtered.length === 0) {
        questionsList.innerHTML = '<div class="empty-state"><h3>아직 등록된 질문이 없어요. 😊</h3></div>';
        return;
    }

    questionsList.innerHTML = filtered.map(q => {
        const isOpen = openQuestionId === q.id;
        return `
        <div class="question-card ${isOpen ? 'open' : ''}">
            <div class="question-summary" onclick="toggleQuestion(${q.id})">
                <div class="question-info">
                    <span class="question-subject">${getSubjectEmoji(q.subject)} ${q.subject}</span>
                    <h3 class="question-title">${q.title}</h3>
                    <div class="question-meta">
                        <span>👤 ${q.author}</span>
                        <span>📅 ${q.date}</span>
                        <span class="answer-count">💬 답변 ${q.answers?.length || 0}개</span>
                    </div>
                </div>
                <div class="toggle-icon">${isOpen ? '▼' : '▶'}</div>
            </div>
            ${isOpen ? `
            <div class="question-detail">
                <div class="question-content">${q.content}</div>
                <div class="answers-section">
                    <h3>💬 답변 목록</h3>
                    ${(q.answers || []).length === 0 ? '<p class="no-answers">첫 번째 답변을 남겨주세요!</p>' : ''}
                    ${(q.answers || []).map(a => `
                        <div class="answer-card">
                            <div class="answer-header"><strong>👤 ${a.author}</strong> <small>${a.date}</small></div>
                            <div class="answer-content">${a.content}</div>
                        </div>
                    `).join('')}
                    <div class="answer-form">
                        <form onsubmit="handleAnswerSubmit(event, ${q.id}, '${q.docId}')">
                            <input type="text" id="ansAuth_${q.id}" placeholder="작성자 이름" required style="margin-bottom:8px;">
                            <textarea id="ansCont_${q.id}" placeholder="답변 내용을 입력하세요" required></textarea>
                            <button type="submit" style="margin-top:8px;">답변 등록 ✨</button>
                        </form>
                    </div>
                </div>
            </div>` : ''}
        </div>`;
    }).join('');
}

// Firestore 실시간 데이터 로드
function loadQuestionsFromFirestore() {
    const q = query(collection(db, 'questions'), orderBy('timestamp', 'desc'));
    onSnapshot(q, (snapshot) => {
        questions = snapshot.docs.map(doc => ({ docId: doc.id, ...doc.data() }));
        displayQuestions();
    }, (error) => {
        console.error("데이터 불러오기 에러:", error);
    });
}

// 전역 윈도우 함수 (HTML에서 접근 가능하도록)
window.toggleQuestion = (id) => {
    openQuestionId = openQuestionId === id ? null : id;
    displayQuestions();
};

window.handleAnswerSubmit = async (e, qId, docId) => {
    e.preventDefault();
    const author = document.getElementById(`ansAuth_${qId}`).value;
    const content = document.getElementById(`ansCont_${qId}`).value;
    
    const targetIdx = questions.findIndex(q => q.id === qId);
    const existingAnswers = questions[targetIdx].answers || [];
    const newAnswers = [...existingAnswers, { 
        author, 
        content, 
        date: new Date().toLocaleString('ko-KR') 
    }];

    try {
        const docRef = doc(db, 'questions', docId);
        await updateDoc(docRef, { answers: newAnswers });
        alert('답변이 등록되었습니다!');
    } catch (error) {
        alert('답변 등록 실패: ' + error.message);
    }
};

function getSubjectEmoji(s) {
    const map = {'국어':'📝','수학':'🔢','사회':'🌍','과학':'🔬','영어':'🌐','체육':'⚽','음악':'🎵','미술':'🎨','도덕':'💝','기타':'📚'};
    return map[s] || '📚';
}
