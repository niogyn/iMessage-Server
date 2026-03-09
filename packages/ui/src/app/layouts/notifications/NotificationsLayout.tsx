import React, { useRef, useState, useEffect } from 'react';
import {
    Box,
    Divider,
    Flex,
    Stack,
    Text,
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
    Button,
    Spacer,
    SimpleGrid,
    Popover,
    PopoverCloseButton,
    PopoverContent,
    PopoverHeader,
    PopoverBody,
    PopoverArrow,
    PopoverTrigger,
    useBoolean,
    Link,
    Tabs,
    Tab,
    TabList,
    TabPanels,
    TabPanel
} from '@chakra-ui/react';
import { BsChevronDown } from 'react-icons/bs';
import { FiTrash } from 'react-icons/fi';
import { AiOutlineInfoCircle } from 'react-icons/ai';

import { DropZone } from '../../components/DropZone';
import { LogsTable } from '../../components/tables/LogsTable';
import { ErrorDialog, ErrorItem } from '../../components/modals/ErrorDialog';
import { ConfirmationDialog } from '../../components/modals/ConfirmationDialog';
import { hasKey, readFile } from '../../utils/GenericUtils';
import { clearDevices, getFcmConfig } from '../../utils/IpcUtils';
import { clearFcmConfiguration, saveFcmClient, saveFcmServer } from '../../actions/FcmActions';
import { ConfigItem, setConfig, setConfigBulk } from '../../slices/ConfigSlice';
import { ProgressStatus } from '../../types';
import { baseTheme } from '../../../theme';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { GoogleAuthButton } from '../../components/firebase/GoogleAuthButton';
import { ProjectPicker } from '../../components/firebase/ProjectPicker';
import { FcmStatusAlert } from '../../components/firebase/FcmStatusAlert';
import { OauthStatusIcon } from '../../components/firebase/OauthStatusIcon';
import { useFirebaseSetup } from '../../hooks/useFirebaseSetup';
import { isValidClientConfig, isValidServerConfig, isValidFirebaseUrl } from '../../utils/FcmUtils';
import { showSuccessToast, showErrorToast } from '../../utils/ToastUtils';


let dragCounter = 0;

export const NotificationsLayout = (): JSX.Element => {
    const dispatch = useAppDispatch();
    const alertRef = useRef(null);
    const [isDragging, setDragging] = useBoolean();
    const [requiresConfirmation, setRequiresConfirmation] = useState(null as string | null);
    const [confirmParams, setConfirmParams] = useState({} as Record<string, any>);

    const {
        authStatus,
        oauthUrl,
        oauthMode,
        setOauthMode,
        firebaseProjects,
        selectedProject,
        setSelectedProject,
        errors: hookErrors,
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

    const [localErrors, setLocalErrors] = useState([] as Array<ErrorItem>);
    const allErrors = [...hookErrors, ...localErrors];
    const alertOpen = allErrors.length > 0;

    const confirmationActions: NodeJS.Dict<any> = {
        clearConfiguration: {
            message: (
                'Are you sure you want to clear your FCM Configuration?<br /><br />' +
                'Doing so will prevent notifications from being delivered until ' +
                'your configuration is re-loaded'
            ),
            func: async () => {
                const success = await clearFcmConfiguration();
                if (success) {
                    dispatch(setConfig({ name: 'fcm_client', 'value': null }));
                    dispatch(setConfig({ name: 'fcm_server', 'value': null }));
                }
            }
        },
        overwriteFirebase: {
            message: (
                'It looks like your Firebase project has changed!<br /><br />' +
                'Continuing will automatically clear your registered devices. ' +
                'This is to make sure that your devices are connected to the correct ' +
                'Firebase project. You may need to re-register your devices!'
            ),
            func: async () => {
                await clearDevices();
                dispatch(setConfig({ name: 'fcm_server', 'value': confirmParams.jsonData }));
                await saveFcmServer(confirmParams.jsonData);
            }
        },
        switchProject: {
            message: (
                'Switching to a different Firebase project will clear all registered devices. ' +
                'Your devices will need to re-register for notifications.'
            ),
            func: async () => {
                await handleExistingProjectSetup(confirmParams.projectId);
            }
        }
    };

    useEffect(() => {
        getFcmConfig().then((cfg: any) => {
            if (!cfg) return;
            const items: Array<ConfigItem> = [
                { name: 'fcm_client', value: cfg.fcm_client, saveToDb: false },
                { name: 'fcm_server', value: cfg.fcm_server, saveToDb: false }
            ];
            dispatch(setConfigBulk(items));
        });
    }, []);

    const needsConfirmation = async (files: Blob[]): Promise<boolean> => {
        if (serverFcm?.project_id == null) return false;
        for (let i = 0; i < files.length; i++) {
            try {
                const fileStr = await readFile(files[i]);
                const validServer = isValidServerConfig(fileStr);
                const jsonData = JSON.parse(fileStr);
                if (!validServer) continue;
                if (serverFcm.project_id !== jsonData.project_id) return true;
            } catch {
                // ignore
            }
        }
        return false;
    };

    const onDrop = async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        dragCounter = 0;
        setDragging.off();

        const listCopy: Array<Blob> = [];
        for (let i = 0; i < e.dataTransfer.files.length; i++) {
            listCopy.push(e.dataTransfer.files.item(i) as Blob);
        }

        const mustConfirm = await needsConfirmation(listCopy);
        if (mustConfirm) {
            const fileStr = await readFile(listCopy.find(() => true) as Blob);
            const jsonData = JSON.parse(fileStr);
            setConfirmParams({ jsonData });
            confirm('overwriteFirebase');
            return;
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

    const confirm = (confirmationType: string | null) => {
        setRequiresConfirmation(confirmationType);
    };

    const onProjectSelect = async (projectId: string) => {
        const currentProjectId = serverFcm?.project_id;
        if (currentProjectId && currentProjectId !== projectId) {
            setConfirmParams({ projectId });
            confirm('switchProject');
        } else {
            await handleExistingProjectSetup(projectId);
        }
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
        <Box
            p={8}
            borderRadius={10}
            onDragEnter={(e) => onDragEnter(e)}
            onDragLeave={() => onDragLeave()}
            onDragOver={(e) => onDragOver(e)}
            onDrop={(e) => onDrop(e)}
        >
            <Text fontSize='2xl'>Notifications</Text>
            <Divider orientation='horizontal' />
            <Text fontSize='md' mt={5} mb={5}>
                BlueBubbles utilizes Google Firebase to deliver notifications to your devices.
                This includes delivering notifications on Android as well as server URL changes to all clients (Android, Desktop, & Web).
                <b>
                    &nbsp;Failing to configure this will mean server URL changes will not sync with BlueBubbles clients.
                </b>
            </Text>
            <FcmStatusAlert authStatus={authStatus} projectId={serverFcm?.project_id} />

            {authStatus === ProgressStatus.COMPLETED && (
                <Button size='xs' mt={2} variant='outline' onClick={onTestConfig}>
                    Test Configuration
                </Button>
            )}

            <Tabs mt={2}>
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
                                onConfigure={() => onProjectSelect(selectedProject)}
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
                        <Stack direction='column' pb={5} pt={2}>
                            <Flex flexDirection='row' justifyContent='flex-start' alignItems='center'>
                                <Text fontSize='2xl'>Configuration</Text>
                                <Popover trigger='hover'>
                                    <PopoverTrigger>
                                        <Box ml={2} _hover={{ color: 'brand.primary', cursor: 'pointer' }}>
                                            <AiOutlineInfoCircle />
                                        </Box>
                                    </PopoverTrigger>
                                    <PopoverContent>
                                        <PopoverArrow />
                                        <PopoverCloseButton />
                                        <PopoverHeader>Information</PopoverHeader>
                                        <PopoverBody>
                                            <Text>
                                                Drag and drop your JSON configuration files from your Google Firebase Console. If you
                                                do not have these configuration files, please go to
                                                <span style={{ color: baseTheme.colors.brand.primary }}>
                                                    <Link href='https://bluebubbles.app/install' color='brand.primary' target='_blank'> Our Website </Link>
                                                </span>
                                                to learn how.
                                            </Text>
                                        </PopoverBody>
                                    </PopoverContent>
                                </Popover>
                            </Flex>
                            <Divider orientation='horizontal' />
                            <Spacer />
                            <Stack direction='column'>
                                <Flex flexDirection="row" justifyContent="flex-start">
                                    <Menu>
                                        <MenuButton
                                            as={Button}
                                            rightIcon={<BsChevronDown />}
                                            width="12em"
                                            mr={5}
                                        >
                                            Manage
                                        </MenuButton>
                                        <MenuList>
                                            <MenuItem icon={<FiTrash />} onClick={() => confirm('clearConfiguration')}>
                                                Clear Configuration
                                            </MenuItem>
                                        </MenuList>
                                    </Menu>
                                </Flex>
                            </Stack>
                            <Box mt={3} />
                            <SimpleGrid columns={2} spacing={5}>
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
                        </Stack>
                    </TabPanel>
                </TabPanels>
            </Tabs>

            <ErrorDialog
                errors={allErrors}
                modalRef={alertRef}
                onClose={() => {
                    clearErrors();
                    setLocalErrors([]);
                }}
                isOpen={alertOpen}
            />

            <ConfirmationDialog
                modalRef={alertRef}
                onClose={() => confirm(null)}
                body={confirmationActions[requiresConfirmation as string]?.message}
                onAccept={() => {
                    if (hasKey(confirmationActions, requiresConfirmation as string)) {
                        confirmationActions[requiresConfirmation as string].func();
                    }
                }}
                isOpen={requiresConfirmation !== null}
            />
        </Box>
    );
};
