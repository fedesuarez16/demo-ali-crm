# 🔑 Guía: Configurar Token de Acceso Permanente para WhatsApp Business API

## ❌ Problema

El token de acceso de Facebook/WhatsApp Business API se vence muy rápido (1-2 horas), causando errores como:
```
Error validating access token: Session has expired
```

## ✅ Solución: Token de Larga Duración (Long-Lived Access Token)

### Opción 1: Generar Token de Larga Duración (60 días)

#### Paso 1: Obtener Token de Corta Duración

1. Ve a [Facebook Developers](https://developers.facebook.com/)
2. Selecciona tu **App** de WhatsApp Business
3. Ve a **Tools** → **Graph API Explorer**
4. Selecciona tu app en el dropdown
5. En **User or Page**, selecciona la **Página** de WhatsApp Business
6. En **Permissions**, selecciona:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
   - `pages_read_engagement`
   - `pages_manage_metadata`
7. Haz clic en **Generate Access Token**
8. **Copia el token** (este es un token de corta duración)

#### Paso 2: Convertir a Token de Larga Duración

Usa la **Graph API** para convertir el token:

**Opción A: Usando Graph API Explorer**

1. Ve a [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
  2. En el campo de URL, pega la URL completa:
     ```
    https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=TU_APP_ID&client_secret=TU_APP_SECRET&fb_exchange_token=TU_TOKEN_CORTA_DURACION
     ```

     https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=1802647690418774&client_secret=38504fdbe33d8b28c1dd5b54b1a0c6b0&fb_exchange_token=EAAIuMPGAobYBQAkSWW9wJkiaxEzVQWHQAZCkyZBGHTMwI7ZAUTanHJ9u1NAcQSqBIkRPJ3uPQGQk7Cj69DdhlZC6mk7cjBxaQRQNQx7ktV4Jr1CZAZCBBx6HUSEMuz10MzECPUX3gW4upXZATy7gCybjzZABCbTS892Pld68ZCfUfafvMYt0yfcXh1TTYvvuQv2wDQXQH7R1cZBfsMUKCnwqZAZAbI8Gwgn2zZBKMmvA6NdCCG1Xj3PcBoexdstezxkT1hpgp8ZB2iMEhQl9LDr9ZAtsoKhsF9TnMZBV


  3. Reemplaza:
   - `TU_APP_ID`: Tu App ID (lo encuentras en Settings → Basic)
   - `TU_APP_SECRET`: Tu App Secret (lo encuentras en Settings → Basic)
   - `TU_TOKEN_CORTA_DURACION`: El token que copiaste en el Paso 1
4. Haz clic en **Submit**
5. **Copia el nuevo token** (este dura 60 días)

**Opción B: Usando cURL**

```bash
curl -X GET "https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=TU_APP_ID&client_secret=TU_APP_SECRET&fb_exchange_token=TU_TOKEN_CORTA_DURACION"
```

**Opción C: Usando el navegador**

Abre esta URL en tu navegador (reemplaza los valores):
```
https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=TU_APP_ID&client_secret=TU_APP_SECRET&fb_exchange_token=TU_TOKEN_CORTA_DURACION
```

### Opción 2: Token de Página (Page Access Token) - Recomendado

Este token **NO expira** si se configura correctamente:

#### Paso 1: Obtener Page Access Token

1. Ve a [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
2. Selecciona tu **App**
3. En **User or Page**, selecciona tu **Página de WhatsApp Business**
4. En **Permissions**, selecciona:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
   - `pages_read_engagement`
   - `pages_manage_metadata`
5. Haz clic en **Generate Access Token**
6. **Copia el token**

#### Paso 2: Verificar que el Token es de Página

1. Ve a [Access Token Debugger](https://developers.facebook.com/tools/debug/accesstoken/)
2. Pega tu token
3. Haz clic en **Debug**
4. Verifica que:
   - **Type**: `PAGE`
   - **Expires**: `Never` o una fecha muy lejana

### Opción 3: Token del Sistema (System User Token) - Para Producción

Este es el método más robusto para producción:

1. Ve a [Business Settings](https://business.facebook.com/settings/)
2. Selecciona tu **Business**
3. Ve a **System Users**
4. Crea un nuevo **System User** o usa uno existente
5. Asigna permisos:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
6. Genera un **Token** para este System User
7. Este token **NO expira** automáticamente

## 🔧 Configurar Token en Chatwoot

### Paso 1: Obtener el Token Final

Una vez que tengas el token de larga duración o permanente:

1. Verifica que el token funciona:
   ```bash
   curl -X GET "https://graph.facebook.com/v21.0/me?access_token=TU_TOKEN"
   ```

### Paso 2: Configurar en Chatwoot

1. Ve a tu instancia de **Chatwoot**
2. Ve a **Settings** → **Inboxes**
3. Selecciona tu **Inbox de WhatsApp**
4. Ve a **Settings** o **Configuration**
5. Busca el campo **Access Token** o **WhatsApp Business API Token**
6. Pega tu **token de larga duración**
7. Guarda los cambios

### Paso 3: Verificar en Chatwoot

1. Intenta enviar un mensaje de prueba desde Chatwoot
2. Si funciona, el token está configurado correctamente

## 🔄 Renovación Automática (Opcional)

Si quieres implementar renovación automática del token, puedes crear un script que:

1. Detecte cuando el token está por expirar
2. Genere un nuevo token de larga duración
3. Actualice el token en Chatwoot automáticamente

### Script de Renovación (Ejemplo)

```javascript
// Este script se ejecutaría periódicamente (ej: cada 30 días)
async function renovarToken() {
  const shortLivedToken = 'TU_TOKEN_CORTA_DURACION';
  const appId = 'TU_APP_ID';
  const appSecret = 'TU_APP_SECRET';
  
  const response = await fetch(
    `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedToken}`
  );
  
  const data = await response.json();
  const longLivedToken = data.access_token;
  
  // Actualizar en Chatwoot (requiere API de Chatwoot)
  // await actualizarTokenEnChatwoot(longLivedToken);
  
  return longLivedToken;
}
```

## 📝 Notas Importantes

1. **Seguridad**: Nunca compartas tus tokens públicamente
2. **App Secret**: Mantén tu App Secret seguro, es como una contraseña
3. **Page Access Token**: Es la mejor opción para producción
4. **System User Token**: Para aplicaciones empresariales grandes
5. **Renovación**: Los tokens de larga duración (60 días) necesitan renovación periódica

## 🆘 Solución de Problemas

### Error: "Invalid OAuth access token"
- Verifica que el token no haya expirado
- Asegúrate de usar el token correcto (Page Access Token)

### Error: "Session has expired"
- El token ha expirado, genera uno nuevo
- Usa un Page Access Token que no expire

### Error: "Insufficient permissions"
- Verifica que el token tenga los permisos necesarios
- Regenera el token con todos los permisos requeridos

## 🔗 Enlaces Útiles

- [Facebook Graph API Explorer](https://developers.facebook.com/tools/explorer/)
- [Access Token Debugger](https://developers.facebook.com/tools/debug/accesstoken/)
- [WhatsApp Business API Documentation](https://developers.facebook.com/docs/whatsapp)
- [Chatwoot WhatsApp Integration](https://www.chatwoot.com/docs/product/channels/whatsapp)

