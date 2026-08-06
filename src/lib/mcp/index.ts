import { auth, defineMcp } from "@lovable.dev/mcp-js";

import createDeadlineTool from "./tools/create-deadline";
import deleteDeadlineTool from "./tools/delete-deadline";
import listDeadlinesTool from "./tools/list-deadlines";
import updateDeadlineTool from "./tools/update-deadline";

// Issuer musi wskazywać bezpośrednio na host Supabase (ref jest jedyną wartością
// niezmienianą przy publikacji). Vite wstawia literał w czasie budowania.
const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "deadline-minder",
  title: "Deadline Minder",
  version: "0.1.0",
  instructions:
    "Narzędzia aplikacji Deadline — tracker terminów ważności (polisy, umowy, certyfikaty, domeny, przeglądy). Użyj list_deadlines, aby odczytać terminy zalogowanego użytkownika, create_deadline aby dodać nowy, update_deadline aby zmienić datę lub przypomnienia, delete_deadline aby usunąć.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  // Rzutowanie: narzędzia bez outputSchema są poprawne w SDK, ale kolidują
  // z exactOptionalPropertyTypes w tym projekcie.
  tools: [listDeadlinesTool, createDeadlineTool, updateDeadlineTool, deleteDeadlineTool] as never[],
});
