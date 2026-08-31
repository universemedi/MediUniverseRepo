package com.MediUnivers.service.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Set;
import java.util.UUID;

/**
 * Local-disk file storage for user-uploaded images (testimonial photos, blog
 * covers, team photos, etc). Saved files are served back publicly at
 * /api/public/uploads/** (see WebConfig). No cloud account is configured for
 * this environment — swap this one class for an S3-backed implementation
 * later without touching any caller, since they only ever see a URL back.
 */
@Service
public class FileStorageService {

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/jpeg", "image/png", "image/webp", "image/gif");

    private final Path uploadsDir;

    public FileStorageService(@Value("${mediunivers.uploads-dir}") String uploadsDir) {
        this.uploadsDir = Path.of(uploadsDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.uploadsDir);
        } catch (IOException e) {
            throw new IllegalStateException("Could not create uploads directory: " + this.uploadsDir, e);
        }
    }

    public String store(MultipartFile file) {
        if (file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No file was uploaded.");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Only JPEG, PNG, WEBP or GIF images are allowed.");
        }

        String extension = switch (contentType) {
            case "image/jpeg" -> ".jpg";
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            case "image/gif" -> ".gif";
            default -> "";
        };
        String filename = UUID.randomUUID() + extension;

        try {
            Files.copy(file.getInputStream(), uploadsDir.resolve(filename));
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Couldn't save the uploaded file.");
        }

        return "/api/public/uploads/" + filename;
    }
}
