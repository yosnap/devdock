/// Avatar image management: copy user-selected images to app data dir,
/// serve them via a stable filename, and clean up on replace/delete.
use std::path::{Path, PathBuf};
use uuid::Uuid;

const AVATARS_SUBDIR: &str = "avatars";
/// Max file size: 5 MB
const MAX_BYTES: u64 = 5 * 1024 * 1024;
/// Allowed image extensions
const ALLOWED_EXT: &[&str] = &["png", "jpg", "jpeg", "webp", "gif"];

/// Returns the avatars directory, creating it if needed.
pub fn avatars_dir(app_data_dir: &Path) -> Result<PathBuf, String> {
    let dir = app_data_dir.join(AVATARS_SUBDIR);
    std::fs::create_dir_all(&dir).map_err(|e| format!("Failed to create avatars dir: {e}"))?;
    Ok(dir)
}

/// Copy a source image file into the avatars directory.
/// Returns the new filename (not full path) stored in DB.
/// Validates extension and file size. Deletes `old_filename` if provided.
pub fn save_avatar(
    app_data_dir: &Path,
    source_path: &str,
    old_filename: Option<&str>,
) -> Result<String, String> {
    let src = Path::new(source_path);

    // Validate extension
    let ext = src
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_lowercase())
        .unwrap_or_default();
    if !ALLOWED_EXT.contains(&ext.as_str()) {
        return Err(format!(
            "Unsupported image format '{}'. Allowed: png, jpg, jpeg, webp, gif",
            ext
        ));
    }

    // Validate size
    let metadata = std::fs::metadata(src).map_err(|e| format!("Cannot read file: {e}"))?;
    if metadata.len() > MAX_BYTES {
        return Err(format!(
            "Image too large ({} MB). Max 5 MB.",
            metadata.len() / 1_048_576
        ));
    }

    let dir = avatars_dir(app_data_dir)?;
    let filename = format!("{}.{}", Uuid::new_v4(), ext);
    let dest = dir.join(&filename);

    std::fs::copy(src, &dest).map_err(|e| format!("Failed to copy avatar: {e}"))?;

    // Remove old avatar after successful copy
    if let Some(old) = old_filename {
        if !old.is_empty() {
            let _ = std::fs::remove_file(dir.join(old));
        }
    }

    Ok(filename)
}

/// Delete an avatar file from disk. Silently ignores missing files.
pub fn delete_avatar(app_data_dir: &Path, filename: &str) {
    if filename.is_empty() { return; }
    let path = app_data_dir.join(AVATARS_SUBDIR).join(filename);
    let _ = std::fs::remove_file(path);
}

/// Return the full absolute path to an avatar file, or None if not found.
pub fn avatar_path(app_data_dir: &Path, filename: &str) -> Option<PathBuf> {
    if filename.is_empty() { return None; }
    let path = app_data_dir.join(AVATARS_SUBDIR).join(filename);
    if path.exists() { Some(path) } else { None }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    #[test]
    fn test_save_and_delete_avatar() {
        let tmp = TempDir::new().unwrap();
        let src = tmp.path().join("test.png");
        fs::write(&src, b"\x89PNG\r\n\x1a\n").unwrap(); // PNG magic bytes

        let filename = save_avatar(tmp.path(), src.to_str().unwrap(), None).unwrap();
        assert!(filename.ends_with(".png"));
        assert!(tmp.path().join("avatars").join(&filename).exists());

        delete_avatar(tmp.path(), &filename);
        assert!(!tmp.path().join("avatars").join(&filename).exists());
    }

    #[test]
    fn test_rejects_invalid_extension() {
        let tmp = TempDir::new().unwrap();
        let src = tmp.path().join("script.sh");
        fs::write(&src, b"#!/bin/sh").unwrap();
        let result = save_avatar(tmp.path(), src.to_str().unwrap(), None);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Unsupported"));
    }

    #[test]
    fn test_old_avatar_deleted_on_replace() {
        let tmp = TempDir::new().unwrap();
        let src1 = tmp.path().join("a.png");
        let src2 = tmp.path().join("b.png");
        fs::write(&src1, b"\x89PNG").unwrap();
        fs::write(&src2, b"\x89PNG").unwrap();

        let old = save_avatar(tmp.path(), src1.to_str().unwrap(), None).unwrap();
        let _new = save_avatar(tmp.path(), src2.to_str().unwrap(), Some(&old)).unwrap();

        assert!(!tmp.path().join("avatars").join(&old).exists(), "old avatar should be deleted");
    }
}
