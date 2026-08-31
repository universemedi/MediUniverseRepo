package com.MediUnivers.service.service;

import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Template Engine spec §7-8: replaces {{placeholder}} tokens before a notification is queued. */
@Service
public class TemplateRenderService {

    private static final Pattern PLACEHOLDER = Pattern.compile("\\{\\{\\s*([a-zA-Z0-9_]+)\\s*}}");

    /** Unknown placeholders are left as-is rather than silently dropped, so a typo in a template is easy to spot. */
    public String render(String template, Map<String, String> variables) {
        if (template == null) return "";
        Matcher matcher = PLACEHOLDER.matcher(template);
        StringBuilder out = new StringBuilder();
        while (matcher.find()) {
            String key = matcher.group(1);
            String value = variables != null ? variables.get(key) : null;
            matcher.appendReplacement(out, Matcher.quoteReplacement(value != null ? value : matcher.group(0)));
        }
        matcher.appendTail(out);
        return out.toString();
    }
}
