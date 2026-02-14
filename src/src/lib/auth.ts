import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { connectDB } from './db';
import User, { UserRole } from '@/models/User';

declare module 'next-auth' {
    interface User {
        id: string;
        phone: string;
        name: string;
        role: UserRole;
    }

    interface Session {
        user: {
            id: string;
            phone: string;
            name: string;
            role: UserRole;
        };
    }
}

declare module '@auth/core/jwt' {
    interface JWT {
        id: string;
        phone: string;
        role: UserRole;
    }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [
        Credentials({
            name: 'Phone',
            credentials: {
                phone: { label: 'Phone Number', type: 'text' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.phone || !credentials?.password) {
                    throw new Error('Phone and password are required');
                }

                await connectDB();

                const user = await User.findOne({ phone: credentials.phone });

                if (!user) {
                    throw new Error('Invalid phone number or password');
                }

                const isValidPassword = await user.comparePassword(
                    credentials.password as string
                );

                if (!isValidPassword) {
                    throw new Error('Invalid phone number or password');
                }

                return {
                    id: user._id.toString(),
                    phone: user.phone,
                    name: user.name,
                    role: user.role,
                };
            },
        }),
    ],
    session: {
        strategy: 'jwt',
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.phone = user.phone;
                token.role = user.role;
            }
            return token;
        },
        async session({ session, token }) {
            if (token) {
                session.user.id = token.id as string;
                session.user.phone = token.phone as string;
                session.user.role = token.role as UserRole;
            }
            return session;
        },
    },
    pages: {
        signIn: '/login',
    },
});
