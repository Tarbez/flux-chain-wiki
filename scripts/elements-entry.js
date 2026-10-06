/* The site's classic-script bridge to Ark UI's shared custom elements.
   Registration is opt-in (defineFluxAuthorizationDialog() is called once,
   by admin.js), so importing this bundle never registers a tag by itself. */
import { defineFluxAuthorizationDialog } from '@deadark/ark-ui/elements';

export { defineFluxAuthorizationDialog };
