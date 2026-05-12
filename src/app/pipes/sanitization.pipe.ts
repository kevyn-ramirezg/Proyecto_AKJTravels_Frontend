import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml, SafeUrl } from '@angular/platform-browser';

/**
 * Pipe para sanitizar HTML y prevenir XSS attacks
 * Uso: {{ userContent | safeHtml }}
 */
@Pipe({
  name: 'safeHtml',
  standalone: true
})
export class SafeHtmlPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(value: string | null | undefined): SafeHtml {
    if (!value) return '';
    
    // Sanitizar el contenido: remove scripts y content peligroso
    // bypassSecurityTrustHtml indica que confías en el contenido
    // Por seguridad, primero limpias caracteres peligrosos
    const cleaned = this.cleanHtml(value);
    return this.sanitizer.bypassSecurityTrustHtml(cleaned);
  }

  /**
   * Limpia HTML removing scripts, event handlers, etc.
   */
  private cleanHtml(html: string): string {
    const temp = document.createElement('div');
    temp.textContent = html;
    return temp.innerHTML;
  }
}

/**
 * Pipe para sanitizar URLs (evitar javascript: protocol)
 * Uso: {{ userUrl | safeUrl }}
 */
@Pipe({
  name: 'safeUrl',
  standalone: true
})
export class SafeUrlPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(value: string | null | undefined): SafeUrl {
    if (!value) return '';
    
    // Validar que no sea javascript: o data:
    if (this.isUnsafeUrl(value)) {
      return '';
    }
    
    return this.sanitizer.bypassSecurityTrustUrl(value);
  }

  private isUnsafeUrl(url: string): boolean {
    const unsafeProtocols = ['javascript:', 'data:', 'vbscript:'];
    const lowerUrl = url.toLowerCase().trim();
    return unsafeProtocols.some(protocol => lowerUrl.startsWith(protocol));
  }
}

/**
 * Servicio centralizado para sanitización
 */
export class SanitizationService {
  constructor(private sanitizer: DomSanitizer) {}

  /**
   * Sanitizar texto plano (convierte caracteres especiales a entities)
   */
  sanitizeText(text: string | null | undefined): string {
    if (!text) return '';
    
    const temp = document.createElement('div');
    temp.textContent = text;
    return temp.innerHTML;
  }

  /**
   * Sanitizar HTML (permite HTML pero remove scripts)
   */
  sanitizeHtml(html: string | null | undefined): SafeHtml {
    if (!html) return '';
    
    // Crear elemento temporal y asignar como texto (no HTML)
    // Esto previene que cualquier script sea interpretado
    const temp = document.createElement('div');
    temp.textContent = html;
    return this.sanitizer.bypassSecurityTrustHtml(temp.innerHTML);
  }

  /**
   * Sanitizar URL (valida que no sea javascript:)
   */
  sanitizeUrl(url: string | null | undefined): SafeUrl {
    if (!url) return '';
    
    const unsafeProtocols = ['javascript:', 'data:', 'vbscript:'];
    const lowerUrl = url.toLowerCase().trim();
    
    if (unsafeProtocols.some(protocol => lowerUrl.startsWith(protocol))) {
      return '';
    }
    
    return this.sanitizer.bypassSecurityTrustUrl(url);
  }
}
