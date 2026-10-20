let language='en';
const es={
  'Welcome':'Bienvenido','How shall I call you?':'¿Cómo quieres que te llame?','Username':'Nombre de usuario','Language':'Idioma','Begin':'Comenzar',
  'Your path':'Tu camino','What would you like to practice or understand?':'¿Qué te gustaría practicar o comprender?',
  'What should I remember about your learning?':'¿Qué debería recordar sobre tu aprendizaje?',
  'Save':'Guardar','Saved.':'Guardado.','Recent conversations':'Conversaciones recientes','Forget my profile and conversations':'Borrar mi perfil y mis conversaciones',
  'Saved on this PC. This browser remembers your profile. Learning notes are tentative, not a judgment of your understanding.':'Guardado en este PC. Este navegador recuerda tu perfil. Las notas de aprendizaje son orientativas; no son una evaluación de tu comprensión.',
  'Show all':'Mostrar todo','Continue →':'Continuar →','Speak…':'Escribe…','Your message':'Tu mensaje','Send message':'Enviar mensaje','Send':'Enviar',
  'What is on your mind?':'¿Qué tienes en mente?','Could you tell me a little more?':'¿Podrías contarme un poco más?',
  'Player profile and memories':'Perfil y recuerdos','Close profile':'Cerrar perfil','Close source':'Cerrar fuente','Read source passage':'Leer el pasaje original',
  'Read the complete source ↗':'Leer la fuente completa ↗','Edition and original language':'Edición e idioma original',
  'The dialogue is an AI portrayal, not a historical quotation. This excerpt comes from the source text; its formatting is normalized. Attribution of speakers depends on the original context.':'El diálogo es una representación con IA, no una cita histórica. Este extracto proviene del texto fuente, con formato normalizado. La atribución de las palabras depende del contexto original.',
  'Could not load your profile.':'No se pudo cargar tu perfil.','Could not forget this profile.':'No se pudo borrar este perfil.',
  'Delete this player’s saved profile and all their conversations?':'¿Borrar el perfil de este jugador y todas sus conversaciones?',
  'Please enter a username.':'Escribe un nombre de usuario.','Choose English or Spanish.':'Elige inglés o español.',
  'Please wait for the current reply before changing memory.':'Espera a que termine la respuesta antes de cambiar el perfil.',
  'Please wait for this reply to finish.':'Espera a que termine esta respuesta.',
  'The local model could not complete a grounded reply. Please try again.':'El modelo local no pudo completar una respuesta fundamentada. Inténtalo de nuevo.',
  'You':'Tú','Reply':'Respuesta','discussions':'conversaciones','You mentioned difficulty; worth revisiting.':'Mencionaste dificultades; conviene repasarlo.',
  'Understanding not yet assessed.':'Comprensión aún no evaluada.','You said:':'Dijiste:',
  'kindness and anger':'bondad e ira','mindfulness':'atención plena','impermanence':'impermanencia','craving and suffering':'deseo y sufrimiento','ethics':'ética','not-self':'no-yo','dependent arising':'surgimiento dependiente',
  'Machine-assisted translation; original in the source.':'Traducción asistida por IA; el original está en la fuente.',
  'Source excerpt (English).':'Extracto de la fuente (en inglés).'
};
export const t=text=>language==='es'?(es[text]||text):text;
export const currentLanguage=()=>language;
export function setLanguage(value){
  language=value==='es'?'es':'en';document.documentElement.lang=language;
  document.getElementById('scene-debug-title').textContent=language==='es'?'Depuración: hora del día':'Debug: time of day';
  document.getElementById('scene-preview-label').textContent=language==='es'?'Vista previa del paisaje':'Preview scenery';
  document.getElementById('scene-preview-note').textContent=language==='es'?'Solo cambia la imagen. Se restablece al recargar.':'Visual preview only. Resets when you reload.';
  const phases=language==='es'?['Automático (hora local)','Amanecer','Mañana','Mediodía','Atardecer','Noche']:['Automatic (local time)','Sunrise','Morning','Midday','Sunset','Night'];
  [...document.getElementById('scene-preview').options].forEach((option,i)=>{option.textContent=phases[i];});
  for(const prefix of ['welcome','player']){
    document.getElementById(`${prefix}-minutes-label`).textContent=language==='es'?'Minutos de meditación por hora':'Meditation minutes per hour';
    document.getElementById(`${prefix}-meditation-note`).textContent=language==='es'?'El Buda elige cuándo sentarse mientras la aplicación está abierta.':'The Buddha chooses when to sit while the app is open.';
  }
  document.title=language==='es'?'Bajo el árbol de Bodhi':'Beneath the Bodhi Tree';
  const labels={'welcome-title':'Welcome','welcome-intro':'How shall I call you?','username-label':'Username','language-label':'Language','begin':'Begin','profile-title':'Your path','profile-name-label':'Username','profile-focus-label':'What would you like to practice or understand?','profile-notes-label':'What should I remember about your learning?','profile-language-label':'Language','save-profile':'Save','forget-profile':'Forget my profile and conversations','reveal':'Show all','next':'Continue →','continue-dialogue':'Continue →'};
  for(const [id,text] of Object.entries(labels))document.getElementById(id).textContent=t(text);
  document.querySelector('.profile-note').textContent=t('Saved on this PC. This browser remembers your profile. Learning notes are tentative, not a judgment of your understanding.');
  document.querySelector('#past-chats').parentElement.querySelector('summary').textContent=t('Recent conversations');
  document.querySelector('label[for="question"]').textContent=t('Your message');
  document.getElementById('question').placeholder=t('Speak…');
  for(const [id,text] of Object.entries({'open-profile':'Player profile and memories','close-profile':'Close profile','close-source':'Close source','send':'Send message','reveal':'Show all','next':'Continue →','continue-dialogue':'Continue →'})){
    document.getElementById(id).setAttribute('aria-label',t(text));document.getElementById(id).title=t(text);
  }
}
