export async function start(load,{timeoutMs=20000,showError=showStartupError}={}) {
  let timer;
  try {
    await Promise.race([
      Promise.resolve().then(load).then(module=>module.ready),
      new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('startup_timeout')),timeoutMs);})
    ]);
    return true;
  }catch {
    showError();
    return false;
  }finally{clearTimeout(timer);}
}
function showStartupError() {
  const main=document.createElement('main');main.id='main';main.className='loading';
  const title=document.createElement('h1');title.textContent='No pudimos iniciar la aplicación.';
  const detail=document.createElement('p');detail.textContent='No se pudo cargar una parte de la aplicación. Recargá la página; si continúa, avisá al equipo coordinador.';
  const retry=document.createElement('a');retry.className='btn';retry.href='/';retry.textContent='Volver a intentar';
  main.append(title,detail,retry);document.getElementById('app').replaceChildren(main);
}
