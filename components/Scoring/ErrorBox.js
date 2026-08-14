'use client';

const ErrorBox = ({ msg }) =>
    msg ? (
        <p className="rounded-xl border border-red-300 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
            {msg}
        </p>
    ) : null;

export default ErrorBox;
