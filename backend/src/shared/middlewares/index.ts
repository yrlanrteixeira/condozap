/**
 * Authorization Middlewares
 *
 * Re-exports from auth/authorize for backwards compatibility.
 * New code should import directly from ../../auth/authorize.
 */

export {
  requireRole,
  requireSuperAdmin,
  requireAdmin,
  requireSyndicStrict,
  requireGlobalScope,
  requireCondoAccess,
  requireComplaintOwner,
} from "../../auth/authorize";
