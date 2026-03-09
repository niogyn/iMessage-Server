import { ipcRenderer } from 'electron';
import { useState, useEffect, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks';
import { setConfig } from '../slices/ConfigSlice';
import { ProgressStatus } from '../types';
import { ErrorItem } from '../components/modals/ErrorDialog';
import {
    getFirebaseOauthUrl,
    listFirebaseProjects,
    setupExistingProject,
    startProjectCreation,
    testFcmConfig
} from '../utils/IpcUtils';
import { saveFcmClient, saveFcmServer } from '../actions/FcmActions';
import { readFile } from '../utils/GenericUtils';
import { validateClientConfig, validateServerConfig, isValidFirebaseUrl } from '../utils/FcmUtils';

export type OauthMode = 'quick-setup' | 'existing-project' | null;

export const useFirebaseSetup = () => {
    const dispatch = useAppDispatch();
    const serverLoaded = (useAppSelector(state => state.config.fcm_server !== null) ?? false);
    const clientLoaded = (useAppSelector(state => state.config.fcm_client !== null) ?? false);
    const serverFcm = useAppSelector(state => state.config.fcm_server as Record<string, any>);
    const logs = useAppSelector(state => state.logStore.logs)
        .filter(log => log.message.startsWith('[OauthService]'));

    const [authStatus, setAuthStatus] = useState(
        (serverLoaded && clientLoaded) ? ProgressStatus.COMPLETED : ProgressStatus.NOT_STARTED
    );
    const [oauthUrl, setOauthUrl] = useState('');
    const [oauthMode, setOauthMode] = useState<OauthMode>(null);
    const [firebaseProjects, setFirebaseProjects] = useState([] as Array<{ projectId: string; displayName: string }>);
    const [selectedProject, setSelectedProject] = useState('');
    const [errors, setErrors] = useState([] as Array<ErrorItem>);

    useEffect(() => {
        ipcRenderer.removeAllListeners('oauth-status');
        ipcRenderer.removeAllListeners('oauth-authenticated');

        getFirebaseOauthUrl().then(url => setOauthUrl(url));

        const onOauthStatus = (_: any, data: ProgressStatus) => {
            setAuthStatus(data);
        };

        const onOauthAuthenticated = async () => {
            if (oauthMode === 'quick-setup') {
                await startProjectCreation();
            } else if (oauthMode === 'existing-project') {
                try {
                    const projects = await listFirebaseProjects();
                    setFirebaseProjects(projects);
                } catch (ex: any) {
                    setErrors([{ id: 'list-projects', message: ex?.message ?? 'Failed to list projects' }]);
                }
            }
        };

        ipcRenderer.on('oauth-status', onOauthStatus);
        ipcRenderer.on('oauth-authenticated', onOauthAuthenticated);

        return () => {
            ipcRenderer.removeListener('oauth-status', onOauthStatus);
            ipcRenderer.removeListener('oauth-authenticated', onOauthAuthenticated);
        };
    }, [oauthMode]);

    const handleExistingProjectSetup = useCallback(async (projectId: string) => {
        setSelectedProject(projectId);
        await setupExistingProject(projectId);
    }, []);

    const handleFileDrop = useCallback(async (files: Array<Blob>) => {
        const newErrors: Array<ErrorItem> = [];

        for (let i = 0; i < files.length; i++) {
            try {
                const fileStr = await readFile(files[i]);
                const clientResult = validateClientConfig(fileStr);
                const serverResult = validateServerConfig(fileStr);
                const jsonData = JSON.parse(fileStr);

                if (clientResult.valid) {
                    if (isValidFirebaseUrl(jsonData)) {
                        await saveFcmClient(jsonData);
                        dispatch(setConfig({ name: 'fcm_client', 'value': jsonData }));
                    } else {
                        throw new Error(
                            'Your Firebase setup does not have a real-time database or Firestore configured. ' +
                            'Please enable one in your Firebase Console.'
                        );
                    }
                } else if (serverResult.valid) {
                    await saveFcmServer(jsonData);
                    dispatch(setConfig({ name: 'fcm_server', 'value': jsonData }));
                } else {
                    const hint = clientResult.error || serverResult.error || 'Unrecognized file format.';
                    throw new Error(`Invalid Firebase configuration file: ${hint}`);
                }
            } catch (ex: any) {
                newErrors.push({ id: String(i), message: ex?.message ?? String(ex) });
            }
        }

        if (newErrors.length > 0) {
            setErrors(newErrors);
        }
    }, [dispatch]);

    const handleFilePickClient = useCallback(async (file: File) => {
        await handleFileDrop([file]);
    }, [handleFileDrop]);

    const handleFilePickServer = useCallback(async (file: File) => {
        await handleFileDrop([file]);
    }, [handleFileDrop]);

    const handleTestConfig = useCallback(async () => {
        return await testFcmConfig();
    }, []);

    const clearErrors = useCallback(() => setErrors([]), []);

    return {
        authStatus,
        oauthUrl,
        oauthMode,
        setOauthMode,
        firebaseProjects,
        selectedProject,
        setSelectedProject,
        errors,
        clearErrors,
        logs,
        serverLoaded,
        clientLoaded,
        serverFcm,
        handleExistingProjectSetup,
        handleFileDrop,
        handleFilePickClient,
        handleFilePickServer,
        handleTestConfig
    };
};
