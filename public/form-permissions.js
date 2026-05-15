(function () {
  const SESSION_STORAGE_KEY = 'tegfinanc.auth';
  const viewablePermissionLevels = new Set(['consulta', 'alteracao', 'exclusao', 'todos']);
  const editablePermissionLevels = new Set(['alteracao', 'todos']);
  const deletablePermissionLevels = new Set(['exclusao', 'todos']);

  const normalizeValue = (value) => String(value || '').trim().toLowerCase();

  const getFormPermissionKeys = (allowedPermissionLevels) => {
    try {
      const rawSession = window.sessionStorage.getItem(SESSION_STORAGE_KEY);

      if (!rawSession) {
        return new Set();
      }

      const session = JSON.parse(rawSession);
      const acessos = Array.isArray(session?.user?.acessos) ? session.user.acessos : [];
      const keys = acessos.flatMap((item) => {
        const permissao = normalizeValue(item?.permissao);

        if (!allowedPermissionLevels.has(permissao)) {
          return [];
        }

        return [normalizeValue(item?.chaveSistema), normalizeValue(item?.chave_sistema), normalizeValue(item?.sigla)].filter(Boolean);
      });

      return new Set(keys);
    } catch {
      return new Set();
    }
  };

  const getViewableFormPermissionKeys = () => getFormPermissionKeys(viewablePermissionLevels);
  const getEditableFormPermissionKeys = () => getFormPermissionKeys(editablePermissionLevels);
  const getDeletableFormPermissionKeys = () => getFormPermissionKeys(deletablePermissionLevels);

  window.tegFormPermissions = {
    hasViewableFormPermission(formAccessKey) {
      return getViewableFormPermissionKeys().has(normalizeValue(formAccessKey));
    },
    hasEditableFormPermission(formAccessKey) {
      return getEditableFormPermissionKeys().has(normalizeValue(formAccessKey));
    },
    hasDeletableFormPermission(formAccessKey) {
      return getDeletableFormPermissionKeys().has(normalizeValue(formAccessKey));
    },
    getEditPermissionDeniedMessage(formLabel) {
      return `Usuario sem permissao de alteracao para o formulario ${formLabel}.`;
    },
    getDeletePermissionDeniedMessage(formLabel) {
      return `Usuario sem permissao de exclusao para o formulario ${formLabel}.`;
    },
  };
})();