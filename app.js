// app.js - Este archivo contiene toda la lógica de JavaScript.
// ¡Asegúrate de que este archivo esté en la misma carpeta que index.html!

// 1. CONFIGURACIÓN Y CONEXIÓN A FIREBASE (CORREGIDO)
const firebaseConfig = {
  apiKey: "AIzaSyCpx81xNSOOQTm_XiwwB452gqQegL6THVs", // Tu clave API
  authDomain: "tests-data-55907.firebaseapp.com",
  projectId: "tests-data-55907",
  storageBucket: "tests-data-55907.firebasestorage.app", // Tu Bucket
  messagingSenderId: "98761713852",
  appId: "1:98761713852:web:82ecbe775f1322ba0248b9"
};

const app = firebase.initializeApp(firebaseConfig);
const storage = app.storage(); // Referencia clave a Storage para subir audios

// 2. CONFIGURACIÓN Y VARIABLES
const COACH_PASSWORD = 'coach123'; // Tu contraseña de coach
        
// Preguntas
const questions = [
    {
        emoji: '☀️',
        textQuestion: 'What do you do <strong>every day</strong>? Tell me about your <u>daily</u> routine.',
        audioQuestion: 'What did you do <strong>yesterday</strong>? Describe your day <strong>from morning to evening</strong>.',
        textPlain: 'What do you do every day? Tell me about your daily routine.',
        audioPlain: 'What did you do yesterday? Describe your day from morning to evening.'
    },
    {
        emoji: '🔧',
        textQuestion: 'Can you describe a challenging situation you <strong>faced</strong> at work or in your personal life? How did you <strong>handle</strong> it?',
        audioQuestion: 'Tell me about a time when you <strong>had to learn</strong> something new quickly. What <strong>steps did you take</strong>?',
        textPlain: 'Can you describe a challenging situation you faced at work or in your personal life? How did you handle it?',
        audioPlain: 'Tell me about a time when you had to learn something new quickly. What steps did you take?'
    },
    {
        emoji: '💡',
        textQuestion: "What's your perspective on how technology is <strong>reshaping</strong> modern education? Do you think it's beneficial or does it present significant drawbacks?",
        audioQuestion: 'If you <strong>could change</strong> one thing about how English is <strong>taught</strong>, what <strong>would it be</strong> and why?',
        textPlain: "What's your perspective on how technology is reshaping modern education? Do you think it's beneficial or does it present significant drawbacks?",
        audioPlain: 'If you could change one thing about how English is taught, what would it be and why?'
    }
];

// Variables globales
let currentStep = 0;
let responses = {
    text1: '', text2: '', text3: '',
    audio1: null, audio2: null, audio3: null
};
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let currentAudio = null;
let currentAudioPlaying = false;

// Inicializar al cargar
document.addEventListener('DOMContentLoaded', function() {
    checkSystemStatus();
    setupEventListeners();
});

// Configurar event listeners
function setupEventListeners() {
    document.getElementById('startBtn').addEventListener('click', startTest);
    document.getElementById('prevBtn').addEventListener('click', prevQuestion);
    document.getElementById('nextBtn').addEventListener('click', nextQuestion);
    document.getElementById('floatCoachBtn').addEventListener('click', showCoachAccess);
    document.getElementById('downloadBtn').addEventListener('click', downloadCoachResults);
    document.getElementById('clearBtn').addEventListener('click', clearAndRelease);
    document.getElementById('logoutBtn').addEventListener('click', logout);
}

// Verificar estado del sistema
function checkSystemStatus() {
    const hasResults = sessionStorage.getItem('testResults');
    const statusBadge = document.getElementById('statusBadge');
    
    if (hasResults) {
        statusBadge.textContent = '● Ocupado';
        statusBadge.className = 'status-badge status-occupied';
        document.getElementById('instructionsSection').classList.add('hidden');
        document.getElementById('blockedSection').classList.remove('hidden');
    } else {
        statusBadge.textContent = '● Disponível';
        statusBadge.className = 'status-badge status-available';
        document.getElementById('blockedSection').classList.add('hidden');
        document.getElementById('instructionsSection').classList.remove('hidden');
    }
}

// Iniciar test
function startTest() {
    const hasResults = sessionStorage.getItem('testResults');
    if (hasResults) {
        alert('❌ Sistema ocupado. Aguarde a coach liberar o sistema.');
        return;
    }
    
    document.getElementById('instructionsSection').classList.add('hidden');
    document.getElementById('progressBar').classList.remove('hidden');
    document.getElementById('questionSection').classList.remove('hidden');
    
    loadQuestion();
}

// Cargar pregunta
function loadQuestion() {
    const question = questions[currentStep];
    
    document.getElementById('questionNumber').textContent = `Question ${currentStep + 1} of 3`;
    document.getElementById('textQuestion').innerHTML = `<span style="font-size: 24px; margin-right: 8px;">${question.emoji}</span>${question.textQuestion}`;
    document.getElementById('audioQuestion').innerHTML = `<span style="font-size: 24px; margin-right: 8px;">${question.emoji}</span>${question.audioQuestion}`;
    document.getElementById('textAnswer').value = responses[`text${currentStep + 1}`] || '';
    
    updateProgressBar();
    updateButtons();
    loadAudioControls();
}

// Actualizar barra de progreso
function updateProgressBar() {
    const progress = ((currentStep + 1) / 3) * 100;
    document.getElementById('progressBarFill').style.width = progress + '%';
}

// Actualizar botones
function updateButtons() {
    document.getElementById('prevBtn').disabled = currentStep === 0;
    document.getElementById('nextBtn').textContent = currentStep === 2 ? 'Enviar Teste ✓' : 'Próxima →';
}

// Cargar controles de audio
function loadAudioControls() {
    const audioKey = `audio${currentStep + 1}`;
    const controls = document.getElementById('audioControls');
    
    if (responses[audioKey]) {
        controls.innerHTML = `
            <div class="audio-player">
                <button class="audio-play-btn" id="playBtn">▶</button>
                <span>Áudio gravado</span>
                <button class="btn-rerecord" id="rerecordBtn">Regravar</button>
            </div>
        `;
        document.getElementById('playBtn').addEventListener('click', toggleAudioPlayback);
        document.getElementById('rerecordBtn').addEventListener('click', deleteAudio);
    } else {
        controls.innerHTML = '<button class="btn btn-record" id="recordBtn">🎤 Gravar Áudio</button>';
        document.getElementById('recordBtn').addEventListener('click', toggleRecording);
    }
}

// Toggle recording
async function toggleRecording() {
    if (isRecording) {
        stopRecording();
    } else {
        await startRecording();
    }
}

// Iniciar grabación
async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            } 
        });
        
        let mimeType = 'audio/webm';
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
            mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {mimeType = 'audio/ogg;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
            mimeType = 'audio/mp4';
        }
        
        mediaRecorder = new MediaRecorder(stream, { mimeType });
        audioChunks = [];
        
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };
        
        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunks, { type: mimeType });
            const audioUrl = URL.createObjectURL(audioBlob);
            responses[`audio${currentStep + 1}`] = {
                url: audioUrl,
                blob: audioBlob,
                mimeType: mimeType
            };
            stream.getTracks().forEach(track => track.stop());
            loadAudioControls();
        };
        
        mediaRecorder.start();
        isRecording = true;
        
        document.getElementById('recordBtn').innerHTML = '⏹ Parar Gravação';
        document.getElementById('recordBtn').className = 'btn btn-recording';
    } catch (err) {
        console.error('Erro ao acessar microfone:', err);
        alert('Erro ao acessar o microfone. Por favor, verifique as permissões do navegador e tente novamente.');
    }
}

// Detener grabación
function stopRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        isRecording = false;
    }
}

// Toggle audio playback
function toggleAudioPlayback() {
    const audioData = responses[`audio${currentStep + 1}`];
    if (!audioData) return;
    
    if (!currentAudio) {
        currentAudio = new Audio(audioData.url);
        currentAudio.onended = () => {
            currentAudioPlaying = false;
            document.getElementById('playBtn').textContent = '▶';
        };
    }
    
    if (currentAudioPlaying) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudioPlaying = false;
        document.getElementById('playBtn').textContent = '▶';
    } else {
        currentAudio.play();
        currentAudioPlaying = true;
        document.getElementById('playBtn').textContent = '⏸';
    }
}

// Eliminar audio
function deleteAudio() {
    responses[`audio${currentStep + 1}`] = null;
    if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
    }
    currentAudioPlaying = false;
    loadAudioControls();
}

// Guardar respuesta actual
function saveCurrentAnswer() {
    responses[`text${currentStep + 1}`] = document.getElementById('textAnswer').value;
}

// Siguiente pregunta
function nextQuestion() {
    saveCurrentAnswer();
    
    if (currentStep === 2) {
        submitTest();
    } else {
        currentStep++;
        loadQuestion();
    }
}

// Pregunta anterior
function prevQuestion() {
    saveCurrentAnswer();
    
    if (currentStep > 0) {
        currentStep--;
        loadQuestion();
    }
}

// FUNCIÓN submitTest para FIREBASE STORAGE
function submitTest() {
    saveCurrentAnswer();
    
    // 1. Preparar datos de texto para sessionStorage
    const textOnlyData = {
        timestamp: new Date().toISOString(),
        responses: {
            text1: responses.text1,
            text2: responses.text2,
            text3: responses.text3,
            // Solo indicamos si hay audio
            audio1: responses.audio1 ? true : false, 
            audio2: responses.audio2 ? true : false,
            audio3: responses.audio3 ? true : false
        }
    };
    
    const uploadPromises = [];
    const dateStamp = new Date().getTime();

    // 2. Subir cada audio a Firebase Storage
    [1, 2, 3].forEach(num => {
        const audioData = responses[`audio${num}`];
        if (audioData && audioData.blob) {
            
            // Nombre único: timestamp_Qx.webm
            const uniqueFileName = `${dateStamp}_Q${num}.${audioData.mimeType.split('/')[1].split(';')[0]}`;
            
            // Referencia a Storage (carpeta /audios)
            const storageRef = storage.ref(`audios/${uniqueFileName}`);
            
            // Subir la Blob
            const uploadTask = storageRef.put(audioData.blob);

            uploadPromises.push(
                new Promise((resolve, reject) => {
                    uploadTask.on('state_changed', 
                        // Sin seguimiento de progreso
                        () => {}, 
                        // Manejo de error
                        (error) => {
                            console.error(`Error al subir audio Q${num}:`, error);
                            alert(`Error al subir audio Q${num}. Revisa la consola.`);
                            // Permite que el test continúe incluso si la subida falla
                            resolve(null); 
                        }, 
                        // Subida completada
                        () => {
                            uploadTask.snapshot.ref.getDownloadURL().then((downloadURL) => {
                                // Guardamos la URL de descarga para el coach
                                textOnlyData.responses[`audio${num}URL`] = downloadURL;
                                resolve(downloadURL);
                            });
                        }
                    );
                })
            );
        }
    });
    
    // 3. Esperar a que todos los audios terminen de subir antes de mostrar la pantalla de éxito
    Promise.all(uploadPromises).then(() => {
        // Guardar la data (sin los blobs de audio) en sessionStorage
        sessionStorage.setItem('testResults', JSON.stringify(textOnlyData)); 
        
        // Mostrar la pantalla de éxito
        document.getElementById('questionSection').classList.add('hidden');
        document.getElementById('progressBar').classList.add('hidden');
        document.getElementById('successScreen').classList.remove('hidden');
        
        // Actualizar el estado
        const statusBadge = document.getElementById('statusBadge');
        statusBadge.textContent = '● Ocupado';
        statusBadge.className = 'status-badge status-occupied';
        
        alert("¡Test enviado con éxito! Audios subidos a Firebase Storage.");
    });
}
// -----------------------------------------------------------------------


// Mostrar acceso coach
function showCoachAccess() {
    const password = prompt('🔐 Acesso Coach\n\nDigite a senha:');
    if (password === COACH_PASSWORD) {
        hideAllSections();
        document.getElementById('coachPanelSection').classList.remove('hidden');
        
        const hasResults = sessionStorage.getItem('testResults');
        if (!hasResults) {
            document.getElementById('testInfo').textContent = 'Não há testes aguardando análise no momento. O sistema está livre para novos alunos.';
        }
    } else if (password !== null) {
        alert('❌ Senha incorreta.');
    }
}

// Ocultar todas las secciones
function hideAllSections() {
    document.getElementById('instructionsSection').classList.add('hidden');
    document.getElementById('blockedSection').classList.add('hidden');
    document.getElementById('questionSection').classList.add('hidden');
    document.getElementById('progressBar').classList.add('hidden');
    document.getElementById('successScreen').classList.add('hidden');
    document.getElementById('coachPanelSection').classList.add('hidden');
}

// Descargar resultados
function downloadCoachResults() {
    const testData = JSON.parse(sessionStorage.getItem('testResults'));
    if (!testData) {
        alert('❌ Nenhum resultado encontrado.');
        return;
    }
    
    const levels = ['A2', 'B1', 'B2'];
    const date = new Date(testData.timestamp);
    
    let textContent = 'YFI PROFILE TEST - RESULTADOS PARA ANÁLISE HUMANIZADA\n';
    textContent += '='.repeat(60) + '\n\n';
    textContent += `Data: ${date.toLocaleString('pt-BR')}\n`;
    textContent += `Timestamp: ${testData.timestamp}\n\n`;
    textContent += 'INSTRUÇÕES PARA COACH:\n';
    textContent += 'Analise as respostas escritas e orais para criar um perfil\n';
    textContent += 'personalizado do nível de inglês do aluno.\n\n';
    textContent += '='.repeat(60) + '\n\n';
    
    questions.forEach((q, i) => {
        textContent += `\n--- PERGUNTA ${i + 1} (Nível ${levels[i]}) ---\n\n`;
        textContent += `📝 PERGUNTA ESCRITA:\n${q.textPlain}\n\n`;
        textContent += `RESPOSTA ESCRITA:\n${testData.responses[`text${i + 1}`] || '[Sem resposta]'}\n\n`;
        // Muestra la URL de Firebase si existe
        const audioStatus = testData.responses[`audio${i + 1}URL`] 
            ? `Áudio gravado. URL Firebase: ${testData.responses[`audio${i + 1}URL`]}` 
            : '[Sem áudio gravado]';
        
        textContent += `🎤 PERGUNTA ORAL:\n${q.audioPlain}\n\n`;
        textContent += `RESPOSTA ORAL: ${audioStatus}\n\n`;
        textContent += '='.repeat(60) + '\n';
    });
    
    textContent += '\n\nNOTAS PARA ANÁLISE:\n';
    textContent += '- Vocabulário utilizado\n';
    textContent += '- Estruturas gramaticais\n';
    textContent += '- Fluência e pronúncia (áudios)\n';
    textContent += '- Coerencia y coesão\n';
    textContent += '- Complexidade das respostas\n';
    
    const textBlob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const textUrl = URL.createObjectURL(textBlob);
    const textLink = document.createElement('a');
    textLink.href = textUrl;
    textLink.download = `YFI_test_${date.getTime()}.txt`;
    textLink.click();
    URL.revokeObjectURL(textUrl);
    
    let message = 'Arquivos baixados com sucesso!\n\n✓ Respostas escritas (TXT) com URLs de áudio\n';
    message += '\n📊 Analise os resultados para criar o perfil do aluno.';
    
    alert(message);
}

// Limpiar y liberar
function clearAndRelease() {
    if (confirm('⚠️ Tem certeza que deseja limpar os resultados e liberar o sistema?\n\nEsta ação não pode ser desfeita. Certifique-se de ter baixado los resultados antes de continuar.')) {
        sessionStorage.removeItem('testResults');
        
        currentStep = 0;
        responses = {
            text1: '', text2: '', text3: '',
            audio1: null, audio2: null, audio3: null
        };
        
        const statusBadge = document.getElementById('statusBadge');
        statusBadge.textContent = '● Disponível';
        statusBadge.className = 'status-badge status-available';
        
        alert('✓ Sistema liberado com sucesso!\n\nO próximo aluno já pode fazer o teste.');
        
        logout();
    }
}

// Logout
function logout() {
    document.getElementById('coachPanelSection').classList.add('hidden');
    checkSystemStatus();
}