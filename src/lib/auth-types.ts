/**
 * Extended Better Auth types
 */

export interface ExtendedUser {
	id: string
	email: string | null
	name: string
	image?: string | null
	avatar_url?: string | null
	banner_url?: string | null
	bio?: string | null
	is_profile_public?: boolean
	show_activity?: boolean
	show_liked_songs?: boolean
	banned?: boolean | null
	createdAt: Date
	updatedAt: Date
	emailVerified: boolean
}
