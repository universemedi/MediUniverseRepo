package com.MediUnivers.service.dto;

import java.util.List;

/** wildcard=true ignores paths; wildcard=false requires at least one path. */
public record RoleAccessInput(String moduleGroup, boolean wildcard, List<String> paths) {
}
