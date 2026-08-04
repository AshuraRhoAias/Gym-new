#[cfg(desktop)]
use std::process::Child;
#[cfg(desktop)]
use std::sync::Mutex;
#[cfg(desktop)]
use tauri::Manager;

#[cfg(desktop)]
struct WhatsAppProcess(Mutex<Option<Child>>);

/// Resuelve la carpeta de whatsapp-service: primero como recurso empaquetado
/// (build de producción), y si no existe, como carpeta hermana del código
/// fuente (`cargo tauri dev` corre con cwd = src-tauri/).
#[cfg(desktop)]
fn resolve_whatsapp_service_dir(app: &tauri::AppHandle) -> Option<std::path::PathBuf> {
  if let Ok(resource_dir) = app.path().resource_dir() {
    let bundled = resource_dir.join("whatsapp-service");
    if bundled.join("src").join("index.js").exists() {
      return Some(bundled);
    }
  }
  let dev_path = std::env::current_dir()
    .ok()?
    .join("..")
    .join("whatsapp-service");
  if dev_path.join("src").join("index.js").exists() {
    return Some(dev_path);
  }
  None
}

/// Lanza `node whatsapp-service/src/index.js` como proceso hijo junto con la
/// app de escritorio. No es fatal si falla (Node no instalado, carpeta no
/// encontrada): el modal de WhatsApp en la web simplemente mostrará
/// "desconectado" hasta que se inicie manualmente (ver whatsapp-service/README.md).
#[cfg(desktop)]
fn spawn_whatsapp_service(app: &tauri::AppHandle) -> Option<Child> {
  let service_dir = resolve_whatsapp_service_dir(app)?;
  let entry = service_dir.join("src").join("index.js");

  match std::process::Command::new("node")
    .arg(&entry)
    .current_dir(&service_dir)
    .spawn()
  {
    Ok(child) => {
      log::info!("whatsapp-service iniciado automáticamente (pid {})", child.id());
      Some(child)
    }
    Err(err) => {
      log::warn!(
        "No se pudo iniciar whatsapp-service automáticamente ({err}). \
         Verifica que Node.js esté instalado o inícialo a mano: ver whatsapp-service/README.md"
      );
      None
    }
  }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let builder = tauri::Builder::default().setup(|_app| {
    if cfg!(debug_assertions) {
      _app.handle().plugin(
        tauri_plugin_log::Builder::default()
          .level(log::LevelFilter::Info)
          .build(),
      )?;
    }

    #[cfg(desktop)]
    {
      let child = spawn_whatsapp_service(_app.handle());
      _app.manage(WhatsAppProcess(Mutex::new(child)));
    }

    Ok(())
  });

  let app = builder
    .build(tauri::generate_context!())
    .expect("error while building tauri application");

  app.run(|_app_handle, _event| {
    #[cfg(desktop)]
    if let tauri::RunEvent::Exit = _event {
      if let Some(state) = _app_handle.try_state::<WhatsAppProcess>() {
        if let Ok(mut guard) = state.0.lock() {
          if let Some(mut child) = guard.take() {
            let _ = child.kill();
          }
        }
      }
    }
  });
}
