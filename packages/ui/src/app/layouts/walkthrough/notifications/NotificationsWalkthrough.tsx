import React, { useRef } from 'react';
import {
    Box,
    Text,
    SlideFade,
    Link,
    SimpleGrid,
    useBoolean,
    Tabs,
    Tab,
    TabList,
    TabPanels,
    TabPanel,
    Button,
    Stack
} from '@chakra-ui/react';
import { LogsTable } from '../../../components/tables/LogsTable';
import { DropZone } from '../../../components/DropZone';
import { ErrorDialog } from '../../../components/modals/ErrorDialog';
import { GoogleAuthButton } from '../../../components/firebase/GoogleAuthButton';
import { ProjectPicker } from '../../../components/firebase/ProjectPicker';
import { FcmStatusAlert } from '../../../components/firebase/FcmStatusAlert';
import { OauthStatusIcon } from '../../../components/firebase/OauthStatusIcon';
import { useFirebaseSetup } from '../../../hooks/useFirebaseSetup';
import { ProgressStatus } from 'app/types';
import { showSuccessToast, showErrorToast } from '../../../utils/ToastUtils';


let dragCounter = 0;

export const NotificationsWalkthrough = (): JSX.Element => {
    const alertRef = useRef(null);
    const [isDragging, setDragging] = useBoolean();

    const {
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
    } = useFirebaseSetup();

    const onDrop = async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        dragCounter = 0;
        setDragging.off();

        const listCopy: Array<Blob> = [];
        for (let i = 0; i < e.dataTransfer.files.length; i++) {
            listCopy.push(e.dataTransfer.files.item(i) as Blob);
        }

        await handleFileDrop(listCopy);
    };

    const onDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (dragCounter === 0) setDragging.on();
        dragCounter += 1;
    };

    const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.stopPropagation();
        e.preventDefault();
    };

    const onDragLeave = () => {
        dragCounter -= 1;
        if (dragCounter === 0) setDragging.off();
    };

    const onTestConfig = async () => {
        const result = await handleTestConfig();
        if (result.success) {
            showSuccessToast({ id: 'fcm-test', description: result.message });
        } else {
            showErrorToast({ id: 'fcm-test', description: result.message });
        }
    };

    return (
        <SlideFade in={true} offsetY='150px'>
            <Box
                px={5}
                onDragEnter={(e) => onDragEnter(e)}
                onDragLeave={() => onDragLeave()}
                onDragOver={(e) => onDragOver(e)}
                onDrop={(e) => onDrop(e)}
            >
                <Text fontSize='4xl'>Notifications &amp; Firebase</Text>
                <Text fontSize='md' mt={5} mb={5}>
                    BlueBubbles utilizes Google FCM (Firebase Cloud Messaging) to deliver notifications and server URL changes to your BlueBubbles clients.
                    We do this so the clients do not need to hold a connection to the server at all times. As a result,
                    BlueBubbles can deliver notifications even when the app is running in the background. This is also used to
                    ensure your current server URL is always synced to your BlueBubbles clients.
                </Text>
                <FcmStatusAlert authStatus={authStatus} projectId={serverFcm?.project_id} />

                {authStatus === ProgressStatus.COMPLETED && (
                    <Button size='xs' mt={2} variant='outline' onClick={onTestConfig}>
                        Test Configuration
                    </Button>
                )}

                <Box mt={3} />
                <Tabs>
                    <TabList>
                        <Tab>Quick Setup</Tab>
                        <Tab>Use Existing Project</Tab>
                        <Tab>Advanced</Tab>
                    </TabList>
                    <TabPanels>
                        <TabPanel>
                            <Text fontSize='md'>
                                BlueBubbles will create a new Firebase project and configure everything automatically.
                                This is the recommended option for most users. Permissions are temporary and revoked after setup.
                            </Text>
                            <Stack direction='row' alignItems='center'>
                                <GoogleAuthButton oauthUrl={oauthUrl} onClick={() => setOauthMode('quick-setup')} />
                                {oauthMode === 'quick-setup' && <OauthStatusIcon status={authStatus} />}
                            </Stack>
                            <Box mt={3} />
                            <LogsTable logs={logs} caption='Monitor setup progress here.' />
                        </TabPanel>

                        <TabPanel>
                            <Text fontSize='md'>
                                Already have a Firebase project? Sign in with Google and select your project.
                                BlueBubbles will automatically configure Firestore, generate credentials, and
                                download the required JSON files.
                            </Text>
                            {firebaseProjects.length === 0 ? (
                                <Stack direction='row' alignItems='center'>
                                    <GoogleAuthButton oauthUrl={oauthUrl} onClick={() => setOauthMode('existing-project')} />
                                    {oauthMode === 'existing-project' && <OauthStatusIcon status={authStatus} />}
                                </Stack>
                            ) : (
                                <ProjectPicker
                                    projects={firebaseProjects}
                                    selectedProject={selectedProject}
                                    onSelect={setSelectedProject}
                                    onConfigure={() => handleExistingProjectSetup(selectedProject)}
                                    isDisabled={authStatus === ProgressStatus.IN_PROGRESS}
                                />
                            )}
                            <Box mt={3} />
                            <LogsTable logs={logs} caption='Monitor setup progress here.' />
                        </TabPanel>

                        <TabPanel>
                            <Text fontSize='md'>
                                For advanced users who already have their Firebase JSON files, or need a custom
                                configuration (e.g., shared Firebase project across multiple servers).
                                Follow the step-by-step instructions here:{' '}
                                <Link
                                    as='span'
                                    href='https://docs.bluebubbles.app/server/installation-guides/manual-setup'
                                    color='brand.primary'
                                    target='_blank'
                                >
                                    Manual Setup Docs
                                </Link>
                            </Text>
                            <Text fontSize='3xl' mt={3}>Firebase Configurations</Text>
                            <SimpleGrid columns={2} spacing={5} mt={5}>
                                <DropZone
                                    text="Drag n' Drop Google Services JSON"
                                    loadedText="Google Services JSON Successfully Loaded!"
                                    isDragging={isDragging}
                                    isLoaded={clientLoaded}
                                    onFilePicked={handleFilePickClient}
                                />
                                <DropZone
                                    text="Drag n' Drop Admin SDK JSON"
                                    loadedText="Admin SDK JSON Successfully Loaded!"
                                    isDragging={isDragging}
                                    isLoaded={serverLoaded}
                                    onFilePicked={handleFilePickServer}
                                />
                            </SimpleGrid>
                        </TabPanel>
                    </TabPanels>
                </Tabs>
            </Box>

            <ErrorDialog
                errors={errors}
                modalRef={alertRef}
                onClose={() => clearErrors()}
                isOpen={errors.length > 0}
            />
        </SlideFade>
    );
};
