/* CLOUD STORAGE - UPDATED DASHBOARD */
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
} from "react";
import { useDropzone } from "react-dropzone";
import { createPortal } from "react-dom";

import apiClient from "../api/client";
import "./DashboardPremium.css";

function Dashboard({ onLogout }) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [profileUserName, setProfileUserName] = useState("User");
  const [profileEmail, setProfileEmail] = useState("");
  const [theme, setTheme] = useState(() =>
    localStorage.getItem("dashboard-theme") || "dark"
  );

  useEffect(() => {
    localStorage.setItem("dashboard-theme", theme);
  }, [theme]);

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      try {
        const response = await apiClient.get("/auth/me");
        if (!mounted) return;

        const user = response.data?.user || response.data || {};
        setProfileUserName(
          user?.name ||
          user?.full_name ||
          user?.username ||
          user?.email ||
          "User"
        );
        setProfileEmail(user?.email || "");
      } catch {
        // Keep the existing dashboard working even if profile lookup fails.
      }
    };

    loadProfile();

    return () => {
      mounted = false;
    };
  }, []);

  const profileInitial =
    String(profileUserName).trim().charAt(0).toUpperCase() || "U";

  // =========================================================
  // MAIN STATE
  // =========================================================

  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);

  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [breadcrumbs, setBreadcrumbs] = useState([]);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  // Storage is the default home screen.
  const [activeSection, setActiveSection] = useState(
    "storage"
  );

  // =========================================================
  // SHARED
  // =========================================================

  const [sharedItems, setSharedItems] = useState([]);
  const [sharedLoading, setSharedLoading] = useState(false);

  // =========================================================
  // TRASH
  // =========================================================

  const [trashFiles, setTrashFiles] = useState([]);
  const [trashLoading, setTrashLoading] = useState(false);

  // =========================================================
  // NEW MENU
  // =========================================================

  const [showNewMenu, setShowNewMenu] = useState(false);

  // =========================================================
  // CREATE FOLDER
  // =========================================================

  const [showFolderModal, setShowFolderModal] =
    useState(false);

  const [newFolderName, setNewFolderName] =
    useState("");

  const [creatingFolder, setCreatingFolder] =
    useState(false);

  // =========================================================
  // UPLOAD
  // =========================================================

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadQueue, setUploadQueue] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [starredFiles, setStarredFiles] = useState(() => new Set());
  const [openMenuFileId, setOpenMenuFileId] = useState(null);
  const [fileMenuPosition, setFileMenuPosition] = useState({ top: 0, left: 0 });

  const [previewFile, setPreviewFile] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const fileInputRef = useRef(null);

  // Close the file action menu whenever the user clicks anywhere outside it.
  useEffect(() => {
    const handleOutsideClick = (event) => {
      const target = event.target;

      if (
        target?.closest?.(".file-action-menu") ||
        target?.closest?.(".file-menu-button")
      ) {
        return;
      }

      setOpenMenuFileId(null);
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  // =========================================================
  // SEARCH
  // =========================================================

  const [searchQuery, setSearchQuery] =
    useState("");

  const [searchResults, setSearchResults] =
    useState(null);

  const [searching, setSearching] =
    useState(false);

  // =========================================================
  // DAY 12 - SORTING & PAGINATION
  // =========================================================

  const [sortBy, setSortBy] = useState("name-asc");
  const [currentPage, setCurrentPage] = useState(1);
  const FILES_PER_PAGE = 12;

  // =========================================================
  // SHARE - DAY 11
  // =========================================================

  const [showShareModal, setShowShareModal] =
    useState(false);

  const [shareFile, setShareFile] =
    useState(null);

  const [shareEmail, setShareEmail] =
    useState("");

  const [shareRole, setShareRole] =
    useState("viewer");

  const [sharing, setSharing] =
    useState(false);

  const [sharedUsers, setSharedUsers] =
    useState([]);

  const [sharedUsersLoading, setSharedUsersLoading] =
    useState(false);

  const [removingShareId, setRemovingShareId] =
    useState(null);

  const [shareTab, setShareTab] =
    useState("people");

  const [publicLinkLoading, setPublicLinkLoading] =
    useState(false);

  const [publicLink, setPublicLink] =
    useState("");

  const [publicExpiryDays, setPublicExpiryDays] =
    useState(7);

  // =========================================================
  // VERSION HISTORY
  // =========================================================

  const [showVersionModal, setShowVersionModal] =
    useState(false);

  const [versionFile, setVersionFile] =
    useState(null);

  const [versions, setVersions] =
    useState([]);

  const [versionsLoading, setVersionsLoading] =
    useState(false);

  // =========================================================
  // STORAGE PAGE
  // =========================================================

  const [storageType, setStorageType] = useState("all");
  const [storageSort, setStorageSort] = useState("size-desc");

  // =========================================================
  // SHARE - DAY 11
  // =========================================================

  // ERROR MESSAGE
  // =========================================================

  const getErrorMessage = (error) => {
    const detail = error.response?.data?.detail;

    if (Array.isArray(detail)) {
      return detail
        .map((item) => item.msg)
        .join(", ");
    }

    if (typeof detail === "string") {
      return detail;
    }

    return (
      error.message ||
      "Something went wrong."
    );
  };

  // =========================================================
  // LOAD MY DRIVE
  // =========================================================

  const loadContent = useCallback(async () => {
    setLoading(true);
    setMessage("");

    try {
      const foldersResponse =
        currentFolderId === null
          ? await apiClient.get("/folders")
          : await apiClient.get("/folders", {
              params: {
                parent_id: currentFolderId,
              },
            });

      const filesResponse =
        await apiClient.get("/files");

      setFolders(foldersResponse.data);
      setFiles(filesResponse.data);

    } catch (error) {
      console.error(
        "Dashboard error:",
        error
      );

      if (
        error.response?.status === 401
      ) {
        onLogout();
        return;
      }

      setMessage(
        getErrorMessage(error)
      );

    } finally {
      setLoading(false);
    }
  }, [
    currentFolderId,
    onLogout,
  ]);

  useEffect(() => {
    // Storage is the default home page and uses the same file data.
    if (
      activeSection === "my-drive" ||
      activeSection === "storage"
    ) {
      loadContent();
    }
  }, [
    loadContent,
    activeSection,
  ]);

  // =========================================================
  // LOAD BREADCRUMBS
  // =========================================================

  useEffect(() => {
    const loadBreadcrumbs =
      async () => {
        if (
          currentFolderId === null
        ) {
          setBreadcrumbs([]);
          return;
        }

        try {
          const response =
            await apiClient.get(
              `/folders/${currentFolderId}/breadcrumbs`
            );

          setBreadcrumbs(
            response.data
          );

        } catch (error) {
          console.error(
            "Breadcrumb error:",
            error
          );

          setBreadcrumbs([]);
        }
      };

    if (
      activeSection === "my-drive"
    ) {
      loadBreadcrumbs();
    }
  }, [
    currentFolderId,
    activeSection,
  ]);

  // =========================================================
  // LOAD SHARED
  // =========================================================

  const loadSharedItems =
    async () => {
      setSharedLoading(true);
      setMessage("");

      try {
        const response =
          await apiClient.get(
            "/shares"
          );

        setSharedItems(
          response.data
        );

      } catch (error) {
        console.error(
          "Shared error:",
          error
        );

        if (
          error.response?.status ===
          401
        ) {
          onLogout();
          return;
        }

        setMessage(
          getErrorMessage(error)
        );

      } finally {
        setSharedLoading(false);
      }
    };

  // =========================================================
  // LOAD TRASH
  // =========================================================

  const loadTrashFiles =
    async () => {
      setTrashLoading(true);
      setMessage("");

      try {
        const response =
          await apiClient.get(
            "/files/trash"
          );

        setTrashFiles(
          response.data
        );

      } catch (error) {
        console.error(
          "Trash error:",
          error
        );

        if (
          error.response?.status ===
          401
        ) {
          onLogout();
          return;
        }

        setMessage(
          getErrorMessage(error)
        );

      } finally {
        setTrashLoading(false);
      }
    };

  // =========================================================
  // OPEN MY DRIVE
  // =========================================================

  const openMyDrive = () => {
    setActiveSection(
      "my-drive"
    );

    setOpenMenuFileId(null);
    setShowNewMenu(false);

    setSearchQuery("");
    setSearchResults(null);

    setMessage("");

    setCurrentFolderId(null);
    setBreadcrumbs([]);
  };

  // =========================================================
  // OPEN SHARED
  // =========================================================

  const openShared = () => {
    setActiveSection(
      "shared"
    );

    setOpenMenuFileId(null);
    setShowNewMenu(false);

    setSearchQuery("");
    setSearchResults(null);

    setCurrentFolderId(null);
    setBreadcrumbs([]);

    loadSharedItems();
  };

  // =========================================================
  // OPEN TRASH
  // =========================================================

  const openTrash = () => {
    setActiveSection(
      "trash"
    );

    setOpenMenuFileId(null);
    setShowNewMenu(false);

    setSearchQuery("");
    setSearchResults(null);

    setCurrentFolderId(null);
    setBreadcrumbs([]);

    loadTrashFiles();
  };

  const openStorage = () => {
    setActiveSection("storage");
    setOpenMenuFileId(null);
    setShowNewMenu(false);
    setSearchQuery("");
    setSearchResults(null);
    setCurrentFolderId(null);
    setBreadcrumbs([]);
    setMessage("");
  };

  const toggleFileMenu = (fileId, event) => {
    if (openMenuFileId === fileId) {
      setOpenMenuFileId(null);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 190;
    const menuHeight = 280;
    const gap = 8;
    const pad = 10;

    let left = rect.right - menuWidth;
    left = Math.max(pad, Math.min(left, window.innerWidth - menuWidth - pad));

    let top = rect.bottom + gap;
    if (top + menuHeight > window.innerHeight - pad) {
      top = rect.top - menuHeight - gap;
    }
    top = Math.max(pad, top);

    setFileMenuPosition({ top, left });
    setOpenMenuFileId(fileId);
  };

  // =========================================================
  // CREATE FOLDER
  // =========================================================

  const handleCreateFolder =
    async (event) => {
      event.preventDefault();

      const name =
        newFolderName.trim();

      if (!name) {
        setMessage(
          "Please enter a folder name."
        );
        return;
      }

      setCreatingFolder(true);
      setMessage("");

      try {
        await apiClient.post(
          "/folders",
          {
            name,
            parent_id:
              currentFolderId,
          }
        );

        setNewFolderName("");
        setShowFolderModal(false);
        setShowNewMenu(false);

        await loadContent();

      } catch (error) {
        console.error(
          "Create folder error:",
          error
        );

        setMessage(
          getErrorMessage(error)
        );

      } finally {
        setCreatingFolder(false);
      }
    };

  // =========================================================
  // UPLOAD - DAY 10
  // =========================================================

  const openFilePicker = () => {
    if (uploading) return;
    setShowUploadModal(true);
  };

  const uploadSingleFile = (file) => {
    return new Promise(async (resolve, reject) => {
      try {
        const contentType =
          file.type || "application/octet-stream";

        const initResponse = await apiClient.post(
          "/files/init-upload",
          {
            filename: file.name,
            size: file.size,
            content_type: contentType,
          }
        );

        const { file_id, upload_url } =
          initResponse.data;

        if (!upload_url) {
          reject(
            new Error(
              "Backend did not return an upload URL."
            )
          );
          return;
        }

        const xhr = new XMLHttpRequest();
        xhr.open("PUT", upload_url);
        xhr.setRequestHeader(
          "Content-Type",
          contentType
        );

        xhr.upload.onprogress = (event) => {
          if (!event.lengthComputable) {
            return;
          }

          setUploadProgress(
            Math.round(
              (event.loaded / event.total) * 100
            )
          );
        };

        xhr.onload = () => {
          if (
            xhr.status >= 200 &&
            xhr.status < 300
          ) {
            resolve({
              file_id,
              filename: file.name,
            });
          } else {
            reject(
              new Error(
                `File upload failed (${xhr.status}).`
              )
            );
          }
        };

        xhr.onerror = () => {
          reject(
            new Error("Network error during upload.")
          );
        };

        xhr.onabort = () => {
          reject(
            new Error("Upload was cancelled.")
          );
        };

        xhr.send(file);
      } catch (error) {
        reject(error);
      }
    });
  };

  const handleFiles = async (selectedFiles) => {
    const filesToUpload = Array.from(
      selectedFiles || []
    );

    if (
      filesToUpload.length === 0 ||
      uploading
    ) {
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setMessage("");

    setUploadQueue(
      filesToUpload.map((file) => ({
        name: file.name,
        status: "waiting",
      }))
    );

    let successCount = 0;
    let failedCount = 0;

    try {
      for (
        let index = 0;
        index < filesToUpload.length;
        index += 1
      ) {
        const file = filesToUpload[index];

        setUploadQueue((current) =>
          current.map((item, itemIndex) =>
            itemIndex === index
              ? {
                  ...item,
                  status: "uploading",
                }
              : item
          )
        );

        setUploadProgress(0);

        try {
          const result =
            await uploadSingleFile(file);

          successCount += 1;

          console.log(
            "Uploaded file ID:",
            result.file_id
          );

          setUploadQueue((current) =>
            current.map((item, itemIndex) =>
              itemIndex === index
                ? {
                    ...item,
                    status: "complete",
                  }
                : item
            )
          );

          setUploadProgress(100);
        } catch (error) {
          failedCount += 1;

          console.error(
            `Upload failed for ${file.name}:`,
            error
          );

          setUploadQueue((current) =>
            current.map((item, itemIndex) =>
              itemIndex === index
                ? {
                    ...item,
                    status: "failed",
                  }
                : item
            )
          );
        }
      }

      if (successCount > 0) {
        setMessage(
          `${successCount} file${
            successCount === 1 ? "" : "s"
          } uploaded successfully${
            failedCount > 0
              ? `. ${failedCount} failed.`
              : "."
          }`
        );

        await loadContent();
      } else {
        setMessage("No files were uploaded.");
      }
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const replaceFile = async (existingFile) => {
    if (!existingFile?.id || uploading) return;

    const input = document.createElement("input");
    input.type = "file";
    input.style.display = "none";

    input.onchange = async () => {
      const selectedFile = input.files?.[0];
      input.remove();

      if (!selectedFile) return;

      setUploading(true);
      setUploadProgress(0);
      setMessage("");

      try {
        const contentType =
          selectedFile.type || "application/octet-stream";

        const response = await apiClient.post(
          `/files/${existingFile.id}/replace/init-upload`,
          {
            filename: selectedFile.name,
            size: selectedFile.size,
            content_type: contentType,
          }
        );

        const uploadUrl = response.data?.upload_url;

        if (!uploadUrl) {
          throw new Error(
            "Backend did not return a replace upload URL."
          );
        }

        await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("PUT", uploadUrl);
          xhr.setRequestHeader("Content-Type", contentType);

          xhr.upload.onprogress = (event) => {
            if (!event.lengthComputable) return;
            setUploadProgress(
              Math.round(
                (event.loaded / event.total) * 100
              )
            );
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              reject(
                new Error(`File replace failed (${xhr.status}).`)
              );
            }
          };

          xhr.onerror = () =>
            reject(new Error("Network error during file replace."));

          xhr.onabort = () =>
            reject(new Error("File replace was cancelled."));

          xhr.send(selectedFile);
        });

        setUploadProgress(100);
        setMessage(
          `"${existingFile.filename}" replaced successfully.`
        );
        await loadContent();
      } catch (error) {
        console.error("Replace file error:", error);
        setMessage(getErrorMessage(error));
      } finally {
        setUploading(false);
        setUploadProgress(0);
      }
    };

    document.body.appendChild(input);
    input.click();
  };

  const handleFileSelected = async (event) => {
    const selectedFiles = event.target.files
      ? Array.from(event.target.files)
      : [];

    event.target.value = "";
    await handleFiles(selectedFiles);
    setShowUploadModal(false);
  };

  const onDrop = useCallback(
    async (acceptedFiles) => {
      await handleFiles(acceptedFiles);
      setShowUploadModal(false);
    },
    [uploading]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    disabled: uploading,
  });

  // =========================================================
  // FILE PREVIEW - DAY 10
  // =========================================================

  const canPreviewFile = (file) => {
    return Boolean(
      file?.content_type?.startsWith("image/") ||
      file?.content_type === "application/pdf"
    );
  };

  const handlePreview = async (file) => {
    if (!file?.id || !canPreviewFile(file)) {
      return;
    }

    setPreviewLoading(true);
    setMessage("");

    try {
      const response = await apiClient.get(
        `/files/${file.id}/download`
      );

      const downloadUrl =
        response.data?.download_url;

      if (!downloadUrl) {
        throw new Error(
          "Preview URL was not returned."
        );
      }

      setPreviewFile({
        ...file,
        previewUrl: downloadUrl,
      });
    } catch (error) {
      console.error(
        "Preview error:",
        error
      );

      setMessage(getErrorMessage(error));
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    setPreviewFile(null);
    setPreviewLoading(false);
  };

  // =========================================================
  // SEARCH - DAY 12 DEBOUNCED
  // =========================================================

  const handleSearch = (event) => {
    setSearchQuery(event.target.value);
  };

  useEffect(() => {
    const value = searchQuery.trim();

    if (!value) {
      setSearchResults(null);
      setSearching(false);
      setMessage("");
      return undefined;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      setMessage("");

      try {
        const response = await apiClient.get("/files/search", {
          params: { q: value },
        });

        setSearchResults(response.data);
      } catch (error) {
        console.error("Search error:", error);

        if (error.response?.status === 401) {
          onLogout();
          return;
        }

        setSearchResults([]);
        setMessage(getErrorMessage(error));
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery, onLogout]);

  // =========================================================
  // CLEAR SEARCH
  // =========================================================

  const clearSearch =
    () => {
      setSearchQuery("");
      setSearchResults(null);
      setSearching(false);
      setMessage("");
    };

  // =========================================================
  // NAVIGATION
  // =========================================================

  const openFolder =
    (folderId) => {
      clearSearch();

      setActiveSection(
        "my-drive"
      );

      setCurrentFolderId(
        folderId
      );
    };

  const goToRoot =
    () => {
      clearSearch();

      setActiveSection(
        "my-drive"
      );

      setCurrentFolderId(null);
    };

  const goToBreadcrumb =
    (folderId) => {
      clearSearch();

      setActiveSection(
        "my-drive"
      );

      setCurrentFolderId(
        folderId
      );
    };

  // =========================================================
  // SHARE - DAY 11
  // =========================================================

  const loadSharedUsers = async (fileId) => {
    if (!fileId) return;

    setSharedUsersLoading(true);

    try {
      const response = await apiClient.get(
        `/shares/file/${fileId}`
      );

      setSharedUsers(response.data || []);
    } catch (error) {
      console.error("Shared users error:", error);
      setSharedUsers([]);

      if (error.response?.status === 401) {
        onLogout();
        return;
      }

      setMessage(getErrorMessage(error));
    } finally {
      setSharedUsersLoading(false);
    }
  };

  const openShareModal = async (file) => {
    setShareFile(file);
    setShareEmail("");
    setShareRole("viewer");
    setShareTab("people");
    setPublicLink("");
    setPublicExpiryDays(7);
    setMessage("");
    setShowShareModal(true);

    await loadSharedUsers(file.id);
  };

  const closeShareModal = () => {
    if (sharing || publicLinkLoading || removingShareId) {
      return;
    }

    setShowShareModal(false);
    setShareFile(null);
    setShareEmail("");
    setShareRole("viewer");
    setSharedUsers([]);
    setShareTab("people");
    setPublicLink("");
    setPublicExpiryDays(7);
  };

  const handleShare = async (event) => {
    event.preventDefault();

    const email = shareEmail.trim().toLowerCase();

    if (!email) {
      setMessage("Please enter an email address.");
      return;
    }

    if (!shareFile?.id) {
      setMessage("No file selected.");
      return;
    }

    setSharing(true);
    setMessage("");

    try {
      await apiClient.post("/shares", {
        email,
        role: shareRole,
        file_id: shareFile.id,
      });

      await loadSharedUsers(shareFile.id);

      setShareEmail("");
      setMessage(
        `"${shareFile.filename}" shared with ${email}.`
      );
    } catch (error) {
      console.error("Share error:", error);
      setMessage(getErrorMessage(error));
    } finally {
      setSharing(false);
    }
  };

  const handleRemoveShare = async (share) => {
    if (!share?.share_id) return;

    const confirmed = window.confirm(
      `Remove access for ${share.email || "this user"}?`
    );

    if (!confirmed) return;

    setRemovingShareId(share.share_id);
    setMessage("");

    try {
      await apiClient.delete(
        `/shares/${share.share_id}`
      );

      setMessage("Access removed successfully.");

      await loadSharedUsers(shareFile.id);
    } catch (error) {
      console.error("Remove share error:", error);
      setMessage(getErrorMessage(error));
    } finally {
      setRemovingShareId(null);
    }
  };

  const handleCreatePublicLink = async () => {
    if (!shareFile?.id) {
      setMessage("No file selected.");
      return;
    }

    setPublicLinkLoading(true);
    setMessage("");

    try {
      const expiresAt = new Date(
        Date.now() + publicExpiryDays * 24 * 60 * 60 * 1000
      ).toISOString();

      const response = await apiClient.post(
        "/public-shares",
        null,
        {
          params: {
            file_id: shareFile.id,
            expires_at: expiresAt,
          },
        }
      );

      const token = response.data?.token;

      if (!token) {
        throw new Error("Public link token was not returned.");
      }

      const link = `${window.location.origin}/public-shares/${token}`;
      setPublicLink(link);
      setMessage("Public link created successfully.");
    } catch (error) {
      console.error("Public link error:", error);
      setMessage(getErrorMessage(error));
    } finally {
      setPublicLinkLoading(false);
    }
  };

  const handleCopyPublicLink = async () => {
    if (!publicLink) return;

    try {
      await navigator.clipboard.writeText(publicLink);
      setMessage("Public link copied to clipboard.");
    } catch (error) {
      console.error("Copy link error:", error);
      setMessage("Could not copy the link. Please copy it manually.");
    }
  };

  // =========================================================
  // VERSION HISTORY
  // =========================================================

  const openVersionHistory = async (file) => {
    if (!file?.id) {
      return;
    }

    setVersionFile(file);
    setVersions([]);
    setVersionsLoading(true);
    setMessage("");

    try {
      const response = await apiClient.get(
        `/files/${file.id}/versions`
      );

      setVersions(response.data || []);
      setShowVersionModal(true);
    } catch (error) {
      console.error(
        "Version history error:",
        error
      );

      setMessage(
        getErrorMessage(error)
      );
    } finally {
      setVersionsLoading(false);
    }
  };

  const closeVersionHistory = () => {
    if (versionsLoading) {
      return;
    }

    setShowVersionModal(false);
    setVersionFile(null);
    setVersions([]);
  };

  const handleVersionDownload = async (version) => {
    if (!versionFile?.id || !version?.id) {
      return;
    }

    try {
      const response = await apiClient.get(
        `/files/${versionFile.id}/versions/${version.id}/download`
      );

      const downloadUrl =
        response.data?.download_url;

      if (!downloadUrl) {
        throw new Error(
          "Version download URL was not returned."
        );
      }

      window.open(
        downloadUrl,
        "_blank",
        "noopener,noreferrer"
      );
    } catch (error) {
      console.error(
        "Version download error:",
        error
      );

      setMessage(
        getErrorMessage(error)
      );
    }
  };

  const handleVersionRestore = async (version) => {
    if (!versionFile?.id || !version?.id) {
      return;
    }

    const confirmed = window.confirm(
      `Restore Version ${version.version_number} of "${versionFile.filename}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      await apiClient.post(
        `/files/${versionFile.id}/versions/${version.id}/restore`
      );

      setMessage(
        `"${versionFile.filename}" restored successfully.`
      );

      closeVersionHistory();
      await loadContent();
    } catch (error) {
      console.error(
        "Version restore error:",
        error
      );

      setMessage(
        getErrorMessage(error)
      );
    }
  };

  // =========================================================
  // DOWNLOAD
  // =========================================================

  const handleDownload =
    async (file) => {
      if (!file?.id) {
        return;
      }

      setMessage("");

      try {
        const response =
          await apiClient.get(
            `/files/${file.id}/download`
          );

        const downloadUrl =
          response.data?.download_url;

        if (!downloadUrl) {
          throw new Error(
            "Download URL was not returned."
          );
        }

        window.open(
          downloadUrl,
          "_blank",
          "noopener,noreferrer"
        );

      } catch (error) {
        console.error(
          "Download error:",
          error
        );

        setMessage(
          getErrorMessage(error)
        );
      }
    };

  // =========================================================
  // MOVE FILE TO TRASH
  // =========================================================

  const handleDeleteFile =
    async (file) => {
      if (!file?.id) {
        return;
      }

      const confirmed =
        window.confirm(
          `Move "${file.filename}" to trash?`
        );

      if (!confirmed) {
        return;
      }

      setMessage("");

      try {
        await apiClient.delete(
          `/files/${file.id}`
        );

        setMessage(
          `"${file.filename}" moved to trash.`
        );

        await loadContent();

      } catch (error) {
        console.error(
          "Delete error:",
          error
        );

        setMessage(
          getErrorMessage(error)
        );
      }
    };

  // =========================================================
  // RESTORE FILE
  // =========================================================

  const handleRestoreFile =
    async (file) => {
      if (!file?.id) {
        return;
      }

      setMessage("");

      try {
        await apiClient.post(
          `/files/${file.id}/restore`
        );

        setMessage(
          `"${file.filename}" restored successfully.`
        );

        await loadTrashFiles();

      } catch (error) {
        console.error(
          "Restore error:",
          error
        );

        setMessage(
          getErrorMessage(error)
        );
      }
    };

  // =========================================================
  // PERMANENT DELETE
  // =========================================================

  const handlePermanentDelete =
    async (file) => {
      if (!file?.id) {
        return;
      }

      const confirmed =
        window.confirm(
          `Permanently delete "${file.filename}"?\n\nThis cannot be undone.`
        );

      if (!confirmed) {
        return;
      }

      setMessage("");

      try {
        await apiClient.delete(
          `/files/${file.id}/permanent`
        );

        setMessage(
          `"${file.filename}" permanently deleted.`
        );

        await loadTrashFiles();

      } catch (error) {
        console.error(
          "Permanent delete error:",
          error
        );

        setMessage(
          getErrorMessage(error)
        );
      }
    };

  // =========================================================
  // FILE SIZE
  // =========================================================

  const formatFileSize =
    (size) => {
      if (!size) {
        return "0 B";
      }

      if (size < 1024) {
        return `${size} B`;
      }

      if (
        size <
        1024 * 1024
      ) {
        return `${(
          size / 1024
        ).toFixed(1)} KB`;
      }

      if (
        size <
        1024 *
        1024 *
        1024
      ) {
        return `${(
          size /
          (1024 * 1024)
        ).toFixed(1)} MB`;
      }

      return `${(
        size /
        (1024 *
          1024 *
          1024)
      ).toFixed(1)} GB`;
    };

  // =========================================================
  // CURRENT FOLDER
  // =========================================================

  const currentFolderName =
    currentFolderId === null
      ? "My Drive"
      : breadcrumbs.length > 0
      ? breadcrumbs[
          breadcrumbs.length - 1
        ].name
      : "Folder";

  const sourceFiles =
    searchResults !== null
      ? searchResults
      : files;

  const sortedFiles = useMemo(() => {
    return [...sourceFiles].sort((a, b) => {
      const nameA = String(a?.filename || a?.name || "").toLowerCase();
      const nameB = String(b?.filename || b?.name || "").toLowerCase();

      if (sortBy === "name-asc") return nameA.localeCompare(nameB);
      if (sortBy === "name-desc") return nameB.localeCompare(nameA);

      if (sortBy === "size-desc") {
        return Number(b?.size || 0) - Number(a?.size || 0);
      }
      if (sortBy === "size-asc") {
        return Number(a?.size || 0) - Number(b?.size || 0);
      }

      const dateA = new Date(
        a?.created_at || a?.updated_at || a?.createdAt || a?.updatedAt || 0
      ).getTime();
      const dateB = new Date(
        b?.created_at || b?.updated_at || b?.createdAt || b?.updatedAt || 0
      ).getTime();

      return sortBy === "date-oldest" ? dateA - dateB : dateB - dateA;
    });
  }, [sourceFiles, sortBy]);

  const totalPages = Math.max(1, Math.ceil(sortedFiles.length / FILES_PER_PAGE));

  const displayedFiles = useMemo(() => {
    const start = (currentPage - 1) * FILES_PER_PAGE;
    return sortedFiles.slice(start, start + FILES_PER_PAGE);
  }, [sortedFiles, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortBy, activeSection, currentFolderId]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // =========================================================
  // STORAGE DATA
  // =========================================================

  const TOTAL_STORAGE_BYTES = 5 * 1024 * 1024 * 1024 * 1024;
  const storageUsedBytes = files.reduce(
    (total, file) => total + Number(file?.size || 0),
    0
  );
  const storagePercent = Math.min(100, (storageUsedBytes / TOTAL_STORAGE_BYTES) * 100);

  const getStorageFileType = (file) => {
    const type = String(file?.content_type || "").toLowerCase();
    const filename = String(file?.filename || "").toLowerCase();
    if (type.includes("pdf") || filename.endsWith(".pdf")) return "documents";
    if (type.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg|bmp|heic)$/i.test(filename)) return "images";
    if (type.startsWith("video/") || /\.(mp4|mov|avi|mkv|webm|m4v)$/i.test(filename)) return "videos";
    return "other";
  };

  const storageFiles = useMemo(() => {
    let result = files.filter((file) => {
      if (storageType !== "all" && getStorageFileType(file) !== storageType) {
        return false;
      }
      return true;
    });

    result.sort((a, b) => {
      if (storageSort === "name-asc") {
        return String(a?.filename || "").localeCompare(String(b?.filename || ""));
      }
      if (storageSort === "name-desc") {
        return String(b?.filename || "").localeCompare(String(a?.filename || ""));
      }
      return Number(b?.size || 0) - Number(a?.size || 0);
    });

    return result;
  }, [files, storageType, storageSort]);

  const storageBreakdown = useMemo(() => {
    const groups = {
      documents: 0,
      images: 0,
      videos: 0,
      other: 0,
    };

    files.forEach((file) => {
      groups[getStorageFileType(file)] += Number(file?.size || 0);
    });

    return groups;
  }, [files]);

  const storageLegend = [
    ["Documents", storageBreakdown.documents, "documents"],
    ["Images", storageBreakdown.images, "images"],
    ["Videos", storageBreakdown.videos, "videos"],
    ["Other", storageBreakdown.other, "other"],
  ];

  // =========================================================
  // RENDER
  // =========================================================


  const pagination = totalPages > 1 ? (
    <div
      className="day12-pagination"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        marginTop: "24px",
        flexWrap: "wrap",
      }}
    >
      <button
        type="button"
        onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
        disabled={currentPage === 1}
      >
        ← Previous
      </button>

      {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
        <button
          key={page}
          type="button"
          onClick={() => setCurrentPage(page)}
          aria-current={currentPage === page ? "page" : undefined}
          style={{ minWidth: "36px", fontWeight: currentPage === page ? 700 : 400 }}
        >
          {page}
        </button>
      ))}

      <button
        type="button"
        onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
        disabled={currentPage === totalPages}
      >
        Next →
      </button>
    </div>
  ) : null;

  return (
    <div className={`dashboard theme-${theme}`}>

      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <aside className="sidebar">

        <div className="sidebar-logo">

          <div className="mini-cloud">
            ☁
            <span>↑</span>
          </div>

          <span>
            Cloud Storage
          </span>

        </div>

        {/* UPLOAD */}

        <button
          className="upload-button"
          onClick={
            openFilePicker
          }
          disabled={uploading}
        >
          <span>＋</span>

          {uploading
            ? "Uploading..."
            : "Upload"}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          hidden
          onChange={
            handleFileSelected
          }
        />

        {/* NAVIGATION */}

        <nav className="sidebar-nav">

          <button
            className={`nav-item ${
              activeSection ===
              "storage"
                ? "active"
                : ""
            }`}
            type="button"
            onClick={openStorage}
          >
            <span>☁</span>
            Storage
          </button>

          <button
            className={`nav-item ${
              activeSection ===
              "my-drive"
                ? "active"
                : ""
            }`}
            type="button"
            onClick={openMyDrive}
          >
            <span>📁</span>
            My Drive
          </button>

          <button
            className={`nav-item ${
              activeSection ===
              "starred"
                ? "active"
                : ""
            }`}
            type="button"
            onClick={() => {
              setActiveSection("starred");
              setOpenMenuFileId(null);
              setShowNewMenu(false);
              setSearchQuery("");
              setSearchResults(null);
              setCurrentFolderId(null);
              setBreadcrumbs([]);
            }}
          >
            <span>⭐</span>
            Starred
          </button>

          <button
            className={`nav-item ${
              activeSection ===
              "shared"
                ? "active"
                : ""
            }`}
            onClick={
              openShared
            }
          >
            <span>🔗</span>
            Shared
          </button>

          <button
            className={`nav-item ${
              activeSection ===
              "trash"
                ? "active"
                : ""
            }`}
            onClick={
              openTrash
            }
          >
            <span>🗑️</span>
            Trash
          </button>

          <button
            className={`nav-item ${
              activeSection === "versions" ? "active" : ""
            }`}
            type="button"
            onClick={() => {
              setActiveSection("versions");
              setOpenMenuFileId(null);
              setShowNewMenu(false);
              setSearchQuery("");
              setSearchResults(null);
              setCurrentFolderId(null);
              setBreadcrumbs([]);
              setMessage("Select a file below to view its version history.");
            }}
          >
            <span>🕘</span>
            Version History
          </button>

        </nav>



      </aside>

      {/* =====================================================
          MAIN
      ===================================================== */}

      <main className="dashboard-main">

        {/* HEADER */}

        <header className="dashboard-header">

          <div className="breadcrumb">

            {activeSection ===
            "shared"
              ? "Shared with me"
              : activeSection ===
                "trash"
              ? "Trash"
              : activeSection === "versions"
              ? "Version History"
              : currentFolderName}

          </div>

          <div className="header-actions">

            <div className="search-box">

              <span>
                🔍
              </span>

              <input
                type="text"
                placeholder="Search files..."
                value={
                  searchQuery
                }
                onChange={
                  handleSearch
                }
              />

              {searchQuery && (
                <button
                  className="search-clear"
                  onClick={
                    clearSearch
                  }
                  type="button"
                >
                  ×
                </button>
              )}

            </div>

            <div className="profile-menu-wrapper">
              <button
                type="button"
                className="user-profile-button"
                onClick={() => {
                  setShowProfileMenu((open) => !open);
                  setShowNewMenu(false);
                }}
                aria-label="Open profile menu"
              >
                <span className="user-avatar">
                  {profileInitial}
                </span>

                <span className="user-profile-name">
                  {profileUserName}
                </span>

                <span className="user-profile-chevron">
                  {showProfileMenu ? "⌃" : "⌄"}
                </span>
              </button>

              {showProfileMenu && (
                <div
                  className="profile-dropdown"
                  style={{ zIndex: 9999 }}
                  onMouseEnter={() => setShowProfileMenu(true)}
                  onMouseLeave={() => setShowProfileMenu(false)}
                >
                  <div className="profile-dropdown-top">
                    <div className="profile-dropdown-avatar">
                      {profileInitial}
                    </div>

                    <div className="profile-dropdown-user">
                      <strong>{profileUserName}</strong>
                      <span>{profileEmail}</span>
                    </div>
                  </div>

                  <div className="profile-dropdown-divider" />

                  <button
                    type="button"
                    className="profile-dropdown-item"
                    onClick={() => {
                      setShowProfileMenu(false);
                      localStorage.removeItem("access_token");
                      localStorage.removeItem("refreshToken");
                      window.location.href = "/login";
                    }}
                  >
                    <span className="profile-dropdown-icon">＋</span>
                    <span>Add another account</span>
                  </button>

                  <button
                    type="button"
                    className="profile-dropdown-item"
                    onClick={() => {
                      setShowProfileMenu(false);
                      onLogout();
                    }}
                  >
                    <span className="profile-dropdown-icon">↪</span>
                    <span>Sign out</span>
                  </button>

                  <button
                    type="button"
                    className="profile-dropdown-item profile-delete-item"
                    onClick={() => {
                      setShowProfileMenu(false);
                      setMessage(
                        "Permanent account deletion is not available yet."
                      );
                    }}
                  >
                    <span className="profile-dropdown-icon">🗑</span>
                    <span>Delete account permanently</span>
                  </button>
                </div>
              )}
            </div>

          </div>

        </header>

        {/* =====================================================
            CONTENT
        ===================================================== */}

        <section className="dashboard-content">

          {/* =================================================
              TRASH PAGE
          ================================================= */}

          {activeSection === "versions" ? (
            <div className="shared-page version-page">
              <div className="content-title">
                <div>
                  <h1>Version History</h1>
                  <p>Select a file to view previous versions.</p>
                </div>
              </div>

              {files.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">🕘</div>
                  <h3>No files available</h3>
                  <p>Upload a file first to manage its versions.</p>
                </div>
              ) : (
                <div
                  className="version-file-list"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                    gap: "16px",
                  }}
                >
                  {files.map((file) => (
                    <div
                      className="version-file-row"
                      key={file.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "14px",
                        minWidth: 0,
                        padding: "16px",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: "14px",
                        background: "rgba(255,255,255,0.025)",
                      }}
                    >
                      <div
                        className="file-icon"
                        style={{
                          flexShrink: 0,
                          width: "48px",
                          height: "48px",
                          display: "grid",
                          placeItems: "center",
                        }}
                      >
                        📄
                      </div>

                      <div
                        className="file-info"
                        style={{
                          minWidth: 0,
                          flex: 1,
                        }}
                      >
                        <h3
                          style={{
                            margin: 0,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={file.filename}
                        >
                          {file.filename}
                        </h3>
                        <p style={{ margin: "6px 0 0" }}>
                          {formatFileSize(file.size)}
                        </p>
                      </div>

                      <button
                        type="button"
                        className="version-open-button"
                        onClick={() => openVersionHistory(file)}
                        style={{
                          flexShrink: 0,
                          whiteSpace: "nowrap",
                        }}
                      >
                        View versions →
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : activeSection === "storage" ? (
            <div className="storage-page">
              <div className="storage-page-topline">
                <div>
                  <h1>Storage</h1>
                  <p>Manage your storage and files.</p>
                </div>
              </div>

              <div className="storage-filters">
                <label className="storage-filter">
                  <span>Type</span>
                  <select value={storageType} onChange={(event) => setStorageType(event.target.value)}>
                    <option value="all">All types</option>
                    <option value="documents">Documents</option>
                    <option value="images">Images</option>
                    <option value="videos">Videos</option>
                    <option value="other">Other</option>
                  </select>
                </label>

              </div>

              <div className="storage-usage">
                <div className="storage-usage-heading">
                  <div>
                    <strong>{formatFileSize(storageUsedBytes)}</strong>
                    <span> of 5 TB used</span>
                  </div>
                  <span className="storage-percent">{storagePercent.toFixed(2)}%</span>
                </div>

                <div className="storage-usage-bar">
                  <div
                    className="storage-usage-fill"
                    style={{ width: `${Math.max(storagePercent, storageUsedBytes > 0 ? 0.5 : 0)}%` }}
                  />
                </div>

                <div className="storage-legend">
                  {storageLegend.map(([label, bytes, className]) => (
                    <span key={className} className="storage-legend-item">
                      <span className={`storage-dot ${className}`} />
                      {label} {formatFileSize(bytes)}
                    </span>
                  ))}
                </div>
              </div>

              {message && <div className="dashboard-message storage-message">{message}</div>}

              <div className="storage-table-header">
                <span>Name</span>
                <label className="storage-sort-label">
                  Storage used
                  <select value={storageSort} onChange={(event) => setStorageSort(event.target.value)}>
                    <option value="size-desc">Largest first</option>
                    <option value="name-asc">Name A–Z</option>
                    <option value="name-desc">Name Z–A</option>
                  </select>
                </label>
              </div>

              {storageFiles.length === 0 ? (
                <div className="storage-empty">
                  <h3>No matching files</h3>
                  <p>Try changing the Type filter.</p>
                </div>
              ) : (
                <div className="storage-file-table">
                  {storageFiles.map((file) => (
                    <div className="storage-table-row" key={file.id}>
                      <div className="storage-file-name-cell">
                        <span className={`storage-file-type ${getStorageFileType(file)}`}>
                          {getStorageFileType(file) === "documents" ? "PDF" : getStorageFileType(file) === "images" ? "IMG" : getStorageFileType(file) === "videos" ? "VID" : "FILE"}
                        </span>
                        <div>
                          <strong title={file.filename}>{file.filename}</strong>
                          <span>{file.content_type || "File"}</span>
                        </div>
                      </div>
                      <span className="storage-file-size-cell">{formatFileSize(file.size)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : activeSection ===
          "trash" ? (

            <div className="shared-page">

              <div className="content-title">

                <div>

                  <h1>
                    Trash
                  </h1>

                  <p>
                    Files you have moved
                    to trash
                  </p>

                </div>

              </div>

              {message && (
                <div className="dashboard-message">
                  {message}
                </div>
              )}

              {trashLoading ? (

                <div className="empty-state">

                  <div className="loading-icon">
                    ☁
                  </div>

                  <h3>
                    Loading trash...
                  </h3>

                  <p>
                    Please wait.
                  </p>

                </div>

              ) : trashFiles.length ===
                0 ? (

                <div className="empty-state">

                  <div className="empty-icon">
                    🗑️
                  </div>

                  <h3>
                    Trash is empty
                  </h3>

                  <p>
                    Deleted files will
                    appear here.
                  </p>

                </div>

              ) : (

                <>

                  <h2 className="section-heading">
                    Deleted files
                  </h2>

                  <div className="file-grid">

                    {trashFiles.map(
                      (file) => (

                        <div
                          className="file-card"
                          key={
                            file.id
                          }
                        >

                          <div className="file-icon">
                            📄
                          </div>

                          <div className="file-info">

                            <h3>
                              {
                                file.filename
                              }
                            </h3>

                            <p>
                              {formatFileSize(
                                file.size
                              )}
                            </p>

                            <span className="share-role">
                              🗑️ In Trash
                            </span>

                          </div>

                          <div className="trash-actions">

                            <button
                              type="button"
                              onClick={() =>
                                handleRestoreFile(
                                  file
                                )
                              }
                            >
                              Restore
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handlePermanentDelete(
                                  file
                                )
                              }
                            >
                              Delete
                            </button>

                          </div>

                        </div>

                      )
                    )}

                  </div>

                </>

              )}

            </div>

          ) : activeSection ===
            "starred" ? (

            /* =================================================
               STARRED PAGE - ADDED ONLY
            ================================================= */

            <div className="shared-page">

              <div className="content-title">
                <div>
                  <h1>⭐ Starred</h1>
                  <p>Files you have starred.</p>
                </div>
              </div>

              {files.filter((file) => starredFiles.has(file.id)).length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">⭐</div>
                  <h3>No starred files</h3>
                  <p>Star a file from its menu and it will appear here.</p>
                </div>
              ) : (
                <div className="file-grid">
                  {files
                    .filter((file) => starredFiles.has(file.id))
                    .map((file) => (
                      <div className="file-card" key={file.id}>
                        <div className="file-icon">📄</div>

                        <div className="file-info">
                          <h3>{file.filename}</h3>
                          <p>{formatFileSize(file.size)}</p>
                          <span className="share-role">⭐ Starred</span>
                        </div>

                        <button
                          type="button"
                          className="file-menu"
                          title="Remove star"
                          onClick={() => {
                            setStarredFiles((current) => {
                              const next = new Set(current);
                              next.delete(file.id);
                              return next;
                            });
                          }}
                        >
                          ⭐
                        </button>
                      </div>
                    ))}
                </div>
              )}

            </div>

          ) : activeSection ===
            "shared" ? (

            /* =================================================
               SHARED PAGE
            ================================================= */

            <div className="shared-page">

              <div className="content-title">

                <div>

                  <h1>
                    Shared with me
                  </h1>

                  <p>
                    Files and folders
                    shared with your
                    account
                  </p>

                </div>

              </div>

              {message && (
                <div className="dashboard-message">
                  {message}
                </div>
              )}

              {sharedLoading ? (

                <div className="empty-state">

                  <div className="loading-icon">
                    ☁
                  </div>

                  <h3>
                    Loading shared
                    items...
                  </h3>

                  <p>
                    Please wait.
                  </p>

                </div>

              ) : sharedItems.length ===
                0 ? (

                <div className="empty-state">

                  <div className="empty-icon">
                    🔗
                  </div>

                  <h3>
                    Nothing shared
                    with you
                  </h3>

                  <p>
                    Files and folders
                    shared with you
                    will appear here.
                  </p>

                </div>

              ) : (

                <>

                  <h2 className="section-heading">
                    Shared items
                  </h2>

                  <div className="file-grid">

                    {sharedItems.map(
                      (item) => (

                        <div
                          className="file-card"
                          key={
                            item.share_id ??
                            item.id
                          }
                        >

                          <div className="file-icon">
                            {item.folder
                              ? "📁"
                              : "📄"}
                          </div>

                          <div className="file-info">

                            <h3>
                              {item.folder
                                ? item.folder.name
                                : item.file?.filename}
                            </h3>

                            <p>
                              {item.folder
                                ? "Folder"
                                : formatFileSize(
                                    item.file?.size
                                  )}
                            </p>

                            <span className="share-role">
                              {item.role ===
                              "editor"
                                ? "✏️ Editor"
                                : "👁 Viewer"}
                            </span>

                          </div>

                          {!item.folder &&
                            item.file && (
                              <button
                                className="file-menu"
                                type="button"
                                onClick={() =>
                                  handleDownload(
                                    item.file
                                  )
                                }
                                title="Download"
                              >
                                ↓
                              </button>
                            )}

                        </div>

                      )
                    )}

                  </div>

                </>

              )}

            </div>

          ) : (

            /* =================================================
               MY DRIVE
            ================================================= */

            <>

              {/* TITLE */}

              <div className="content-title">

                <div>

                  <h1>
                    {searchResults !==
                    null
                      ? "Search Results"
                      : currentFolderName}
                  </h1>

                  <p>
                    {searchResults !==
                    null
                      ? `Results for "${searchQuery}"`
                      : "Manage your files and folders"}
                  </p>

                </div>

                {searchResults ===
                  null && !showProfileMenu && (

                  <div className="new-menu-wrapper">

                    <button
                      className="new-button"
                      onClick={() =>
                        setShowNewMenu(
                          !showNewMenu
                        )
                      }
                    >
                      ＋ New
                    </button>

                    {showNewMenu && (

                      <div className="new-menu">

                        <button
                          onClick={() => {
                            setShowFolderModal(
                              true
                            );

                            setShowNewMenu(
                              false
                            );
                          }}
                        >
                          📁 New Folder
                        </button>

                        <button
                          onClick={() => {
                            setShowNewMenu(
                              false
                            );

                            openFilePicker();
                          }}
                        >
                          📄 Upload File
                        </button>

                      </div>

                    )}

                  </div>

                )}

              </div>

              {/* SEARCH STATUS */}

              {searchResults !==
                null && (

                <div className="search-result-info">

                  {searching
                    ? "Searching..."
                    : `${searchResults.length} result${
                        searchResults.length ===
                        1
                          ? ""
                          : "s"
                      } found`}

                </div>

              )}

              {/* BREADCRUMB */}

              {searchResults ===
                null && (

                <div className="content-breadcrumb">

                  {breadcrumbs.map(
                    (
                      breadcrumb,
                      index
                    ) => (

                      <div
                        key={
                          breadcrumb.id
                        }
                        className="breadcrumb-part"
                      >

                        <span>
                          ›
                        </span>

                        <button
                          className={
                            index ===
                            breadcrumbs.length -
                              1
                              ? "breadcrumb-current"
                              : "breadcrumb-button"
                          }
                          onClick={() =>
                            goToBreadcrumb(
                              breadcrumb.id
                            )
                          }
                        >
                          {
                            breadcrumb.name
                          }
                        </button>

                      </div>

                    )
                  )}

                </div>

              )}

              {/* UPLOAD QUEUE - shown only while uploading */}
              {uploading && uploadQueue.length > 0 && (
                <div className="upload-queue">
                  {uploadQueue.map((item, index) => (
                    <div className="upload-queue-item" key={`${item.name}-${index}`}>
                      <span className="upload-queue-status">
                        {item.status === "complete" ? "✓" : item.status === "failed" ? "!" : item.status === "uploading" ? "↑" : "…"}
                      </span>
                      <span className="upload-queue-name">{item.name}</span>
                      <span className="upload-queue-state">
                        {item.status === "complete" ? "Uploaded" : item.status === "failed" ? "Failed" : item.status === "uploading" ? `${uploadProgress}%` : "Waiting"}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* MESSAGE */}

              {message && (
                <div className="dashboard-message">
                  {message}
                </div>
              )}

              {/* LOADING */}

              {loading ? (

                <div className="empty-state">

                  <div className="loading-icon">
                    ☁
                  </div>

                  <h3>
                    Loading...
                  </h3>

                  <p>
                    Loading your files
                    and folders.
                  </p>

                </div>

              ) : searchResults !==
                null ? (

                /* =================================================
                   SEARCH RESULTS
                ================================================= */

                searchResults.length ===
                0 ? (

                  <div className="empty-state">

                    <div className="empty-icon">
                      🔍
                    </div>

                    <h3>
                      No files found
                    </h3>

                    <p>
                      Try a different
                      search term.
                    </p>

                  </div>

                ) : (

                  <>
                    <div
                      className="day12-toolbar"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "12px",
                      margin: "0 0 16px",
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={{ fontSize: "14px", opacity: 0.75 }}>
                      {sortedFiles.length} file{sortedFiles.length === 1 ? "" : "s"}
                    </span>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px" }}>
                      Sort by
                      <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} aria-label="Sort files">
                        <option value="name-asc">Name (A–Z)</option>
                        <option value="name-desc">Name (Z–A)</option>
                        <option value="date-newest">Date (Newest)</option>
                        <option value="date-oldest">Date (Oldest)</option>
                        <option value="size-desc">Size (Largest)</option>
                        <option value="size-asc">Size (Smallest)</option>
                      </select>
                    </label>
                  </div>

                  <div className="file-grid">

                    {displayedFiles.map(
                      (file) => (

                        <div
                          className="file-card"
                          key={
                            file.id
                          }
                        >

                          <div className="file-icon">
                            📄
                          </div>

                          <div className="file-info">

                            <h3>
                              {
                                file.filename
                              }
                            </h3>

                            <p>
                              {formatFileSize(
                                file.size
                              )}
                            </p>

                          </div>


                          <div
                              className="file-actions"
                              style={{ position: "relative", overflow: "visible" }}
                            >
                              <button
                                type="button"
                                className="file-menu-button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  toggleFileMenu(file.id, event);
                                }}
                                title="File actions"
                                aria-label={`Actions for ${file.filename}`}
                                aria-expanded={openMenuFileId === file.id}
                              >
                                ⋮
                              </button>

                              {openMenuFileId === file.id &&
                                createPortal(
                                  <div
                                    className="file-action-menu"
                                    style={{
                                      position: "fixed",
                                      top: `${fileMenuPosition.top}px`,
                                      left: `${fileMenuPosition.left}px`,
                                      width: "190px",
                                      minWidth: "190px",
                                      maxHeight: "280px",
                                      overflowY: "auto",
                                      padding: "6px",
                                      borderRadius: "10px",
                                      background: "#1f1a14",
                                      border: "1px solid rgba(255,255,255,0.14)",
                                      boxShadow: "0 12px 28px rgba(0,0,0,0.55)",
                                      zIndex: 2147483647,
                                    }}
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  {canPreviewFile(file) && (
                                    <button
                                      type="button"
                                      style={{
                                        display: "block",
                                        width: "100%",
                                        padding: "9px 10px",
                                        border: 0,
                                        background: "transparent",
                                        color: "inherit",
                                        textAlign: "left",
                                        borderRadius: "7px",
                                        cursor: "pointer",
                                      }}
                                      onClick={() => {
                                        setOpenMenuFileId(null);
                                        handlePreview(file);
                                      }}
                                    >
                                      Preview
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    style={{
                                      display: "block",
                                      width: "100%",
                                      padding: "9px 10px",
                                      border: 0,
                                      background: "transparent",
                                      color: "inherit",
                                      textAlign: "left",
                                      borderRadius: "7px",
                                      cursor: "pointer",
                                    }}
                                    onClick={() => {
                                      setOpenMenuFileId(null);
                                      handleDownload(file);
                                    }}
                                  >
                                    Download
                                  </button>

                                  <button
                                    type="button"
                                    style={{
                                      display: "block",
                                      width: "100%",
                                      padding: "9px 10px",
                                      border: 0,
                                      background: "transparent",
                                      color: "inherit",
                                      textAlign: "left",
                                      borderRadius: "7px",
                                      cursor: "pointer",
                                    }}
                                    onClick={() => {
                                      setOpenMenuFileId(null);
                                      openShareModal(file);
                                    }}
                                  >
                                    Share
                                  </button>

                                  <button
                                    type="button"
                                    style={{
                                      display: "block",
                                      width: "100%",
                                      padding: "9px 10px",
                                      border: 0,
                                      background: "transparent",
                                      color: "inherit",
                                      textAlign: "left",
                                      borderRadius: "7px",
                                      cursor: "pointer",
                                    }}
                                    onClick={() => {
                                      setStarredFiles((current) => {
                                        const next = new Set(current);
                                        next.has(file.id)
                                          ? next.delete(file.id)
                                          : next.add(file.id);
                                        return next;
                                      });
                                      setOpenMenuFileId(null);
                                    }}
                                  >
                                    {starredFiles.has(file.id) ? "Remove star" : "Star"}
                                  </button>

                                  <button


                                    type="button"


                                    style={{


                                      display: "block",


                                      width: "100%",


                                      padding: "9px 10px",


                                      border: 0,


                                      background: "transparent",


                                      color: "inherit",


                                      textAlign: "left",


                                      borderRadius: "7px",


                                      cursor: "pointer",


                                    }}


                                    onClick={() => {


                                      setOpenMenuFileId(null);


                                      replaceFile(file);


                                    }}


                                  >


                                    Replace


                                  </button>



                                  <button
                                    type="button"
                                    style={{
                                      display: "block",
                                      width: "100%",
                                      padding: "9px 10px",
                                      border: 0,
                                      background: "transparent",
                                      color: "inherit",
                                      textAlign: "left",
                                      borderRadius: "7px",
                                      cursor: "pointer",
                                    }}
                                    onClick={() => {
                                      setOpenMenuFileId(null);
                                      openVersionHistory(file);
                                    }}
                                  >
                                    Version History
                                  </button>

                                  <button
                                    type="button"
                                    style={{
                                      display: "block",
                                      width: "100%",
                                      padding: "9px 10px",
                                      border: 0,
                                      background: "transparent",
                                      color: "inherit",
                                      textAlign: "left",
                                      borderRadius: "7px",
                                      cursor: "pointer",
                                    }}
                                    onClick={() => {
                                      setOpenMenuFileId(null);
                                      handleDeleteFile(file);
                                    }}
                                  >
                                    Delete
                                  </button>
                                  </div>,
                                  document.body
                                )}
                            </div>

                        </div>

                      )
                    )}

                  </div>

                    {pagination}
                  </>

                )

              ) : (

                /* =================================================
                   NORMAL CONTENT
                ================================================= */

                <>

                  {/* FOLDERS */}

                  {folders.length >
                    0 && (

                    <>

                      <h2 className="section-heading">
                        Folders
                      </h2>

                      <div className="folder-grid">

                        {folders.map(
                          (folder) => (

                            <button
                              className="folder-card"
                              key={
                                folder.id
                              }
                              onClick={() =>
                                openFolder(
                                  folder.id
                                )
                              }
                            >

                              <div className="folder-icon">
                                📁
                              </div>

                              <div className="folder-info">

                                <h3>
                                  {
                                    folder.name
                                  }
                                </h3>

                                <p>
                                  Folder
                                </p>

                              </div>

                              <span className="folder-arrow">
                                ›
                              </span>

                            </button>

                          )
                        )}

                      </div>

                    </>
                  )}

                  {/* DAY 12 - SORTING */}
                  <div
                    className="day12-toolbar"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "12px",
                      margin: "0 0 16px",
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={{ fontSize: "14px", opacity: 0.75 }}>
                      {sortedFiles.length} file{sortedFiles.length === 1 ? "" : "s"}
                    </span>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px" }}>
                      Sort by
                      <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} aria-label="Sort files">
                        <option value="name-asc">Name (A–Z)</option>
                        <option value="name-desc">Name (Z–A)</option>
                        <option value="date-newest">Date (Newest)</option>
                        <option value="date-oldest">Date (Oldest)</option>
                        <option value="size-desc">Size (Largest)</option>
                        <option value="size-asc">Size (Smallest)</option>
                      </select>
                    </label>
                  </div>

                  {/* FILES */}

                  <h2 className="section-heading">
                    Files
                  </h2>

                  {displayedFiles.length ===
                  0 ? (

                    <div className="empty-state">

                      <div className="empty-icon">
                        📂
                      </div>

                      <h3>
                        No files yet
                      </h3>

                      <p>
                        Upload your first
                        file to get started.
                      </p>

                      <button
                        className="upload-empty-button"
                        onClick={
                          openFilePicker
                        }
                      >
                        ＋ Upload File
                      </button>

                    </div>

                  ) : (

                    <>
                      <div className="file-grid">

                      {displayedFiles.map(
                        (file) => (

                          <div
                            className="file-card"
                            key={
                              file.id
                            }
                          >

                            <div className="file-icon">
                              📄
                            </div>

                            <div className="file-info">

                              <h3>
                                {
                                  file.filename
                                }
                              </h3>

                              <p>
                                {formatFileSize(
                                  file.size
                                )}
                              </p>

                            </div>


                            <div
                              className="file-actions"
                              style={{ position: "relative", overflow: "visible" }}
                            >
                              <button
                                type="button"
                                className="file-menu-button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  toggleFileMenu(file.id, event);
                                }}
                                title="File actions"
                                aria-label={`Actions for ${file.filename}`}
                                aria-expanded={openMenuFileId === file.id}
                              >
                                ⋮
                              </button>

                              {openMenuFileId === file.id &&
                                createPortal(
                                  <div
                                    className="file-action-menu"
                                    style={{
                                      position: "fixed",
                                      top: `${fileMenuPosition.top}px`,
                                      left: `${fileMenuPosition.left}px`,
                                      width: "190px",
                                      minWidth: "190px",
                                      maxHeight: "280px",
                                      overflowY: "auto",
                                      padding: "6px",
                                      borderRadius: "10px",
                                      background: "#1f1a14",
                                      border: "1px solid rgba(255,255,255,0.14)",
                                      boxShadow: "0 12px 28px rgba(0,0,0,0.55)",
                                      zIndex: 2147483647,
                                    }}
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  {canPreviewFile(file) && (
                                    <button
                                      type="button"
                                      style={{
                                        display: "block",
                                        width: "100%",
                                        padding: "9px 10px",
                                        border: 0,
                                        background: "transparent",
                                        color: "inherit",
                                        textAlign: "left",
                                        borderRadius: "7px",
                                        cursor: "pointer",
                                      }}
                                      onClick={() => {
                                        setOpenMenuFileId(null);
                                        handlePreview(file);
                                      }}
                                    >
                                      Preview
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    style={{
                                      display: "block",
                                      width: "100%",
                                      padding: "9px 10px",
                                      border: 0,
                                      background: "transparent",
                                      color: "inherit",
                                      textAlign: "left",
                                      borderRadius: "7px",
                                      cursor: "pointer",
                                    }}
                                    onClick={() => {
                                      setOpenMenuFileId(null);
                                      handleDownload(file);
                                    }}
                                  >
                                    Download
                                  </button>

                                  <button
                                    type="button"
                                    style={{
                                      display: "block",
                                      width: "100%",
                                      padding: "9px 10px",
                                      border: 0,
                                      background: "transparent",
                                      color: "inherit",
                                      textAlign: "left",
                                      borderRadius: "7px",
                                      cursor: "pointer",
                                    }}
                                    onClick={() => {
                                      setOpenMenuFileId(null);
                                      openShareModal(file);
                                    }}
                                  >
                                    Share
                                  </button>

                                  <button
                                    type="button"
                                    style={{
                                      display: "block",
                                      width: "100%",
                                      padding: "9px 10px",
                                      border: 0,
                                      background: "transparent",
                                      color: "inherit",
                                      textAlign: "left",
                                      borderRadius: "7px",
                                      cursor: "pointer",
                                    }}
                                    onClick={() => {
                                      setStarredFiles((current) => {
                                        const next = new Set(current);
                                        next.has(file.id)
                                          ? next.delete(file.id)
                                          : next.add(file.id);
                                        return next;
                                      });
                                      setOpenMenuFileId(null);
                                    }}
                                  >
                                    {starredFiles.has(file.id) ? "Remove star" : "Star"}
                                  </button>

                                  <button


                                    type="button"


                                    style={{


                                      display: "block",


                                      width: "100%",


                                      padding: "9px 10px",


                                      border: 0,


                                      background: "transparent",


                                      color: "inherit",


                                      textAlign: "left",


                                      borderRadius: "7px",


                                      cursor: "pointer",


                                    }}


                                    onClick={() => {


                                      setOpenMenuFileId(null);


                                      replaceFile(file);


                                    }}


                                  >


                                    Replace


                                  </button>



                                  <button
                                    type="button"
                                    style={{
                                      display: "block",
                                      width: "100%",
                                      padding: "9px 10px",
                                      border: 0,
                                      background: "transparent",
                                      color: "inherit",
                                      textAlign: "left",
                                      borderRadius: "7px",
                                      cursor: "pointer",
                                    }}
                                    onClick={() => {
                                      setOpenMenuFileId(null);
                                      openVersionHistory(file);
                                    }}
                                  >
                                    Version History
                                  </button>

                                  <button
                                    type="button"
                                    style={{
                                      display: "block",
                                      width: "100%",
                                      padding: "9px 10px",
                                      border: 0,
                                      background: "transparent",
                                      color: "inherit",
                                      textAlign: "left",
                                      borderRadius: "7px",
                                      cursor: "pointer",
                                    }}
                                    onClick={() => {
                                      setOpenMenuFileId(null);
                                      handleDeleteFile(file);
                                    }}
                                  >
                                    Delete
                                  </button>
                                  </div>,
                                  document.body
                                )}
                            </div>

                          </div>

                        )
                      )}

                    </div>

                      {pagination}
                    </>

                  )}

                </>

              )}

            </>

          )}

        </section>

      </main>

      {/* UPLOAD MODAL */}
      {showUploadModal && (
        <div className="modal-overlay" onClick={() => !uploading && setShowUploadModal(false)}>
          <div className="upload-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Upload files</h2>
                <p>Choose files or drag them into the area below.</p>
              </div>
              <button className="modal-close" type="button" onClick={() => !uploading && setShowUploadModal(false)} disabled={uploading}>×</button>
            </div>

            <div
              {...getRootProps()}
              className={`upload-dropzone upload-modal-dropzone ${isDragActive ? "drag-active" : ""} ${uploading ? "uploading" : ""}`}
            >
              <input {...getInputProps()} />
              <div className="dropzone-icon">{isDragActive ? "📥" : "☁️"}</div>
              <div className="dropzone-content">
                <strong>{isDragActive ? "Drop files here" : "Drag & drop files here"}</strong>
                <span>or click to browse files</span>
                <small>Multiple files supported</small>
              </div>

              {uploading && (
                <div className="upload-progress-area">
                  <div className="upload-progress-header">
                    <span>Uploading...</span>
                    <strong>{uploadProgress}%</strong>
                  </div>
                  <div className="upload-progress-bar">
                    <div className="upload-progress-used" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          CREATE FOLDER MODAL
      ===================================================== */}

      {showFolderModal && (

        <div
          className="modal-overlay"
          onClick={() =>
            setShowFolderModal(
              false
            )
          }
        >

          <div
            className="folder-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="modal-header">

              <div>

                <h2>
                  Create New Folder
                </h2>

                <p>
                  Add a folder to{" "}
                  {currentFolderName}
                </p>

              </div>

              <button
                className="modal-close"
                onClick={() =>
                  setShowFolderModal(
                    false
                  )
                }
                type="button"
              >
                ×
              </button>

            </div>

            <form
              onSubmit={
                handleCreateFolder
              }
            >

              <label>
                Folder name
              </label>

              <input
                autoFocus
                type="text"
                placeholder="Enter folder name"
                value={
                  newFolderName
                }
                onChange={(event) =>
                  setNewFolderName(
                    event.target.value
                  )
                }
                maxLength={255}
                required
              />

              <div className="modal-actions">

                <button
                  type="button"
                  className="cancel-button"
                  onClick={() =>
                    setShowFolderModal(
                      false
                    )
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="create-folder-button"
                  disabled={
                    creatingFolder
                  }
                >
                  {creatingFolder
                    ? "Creating..."
                    : "Create Folder"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

      {/* =====================================================
          SHARE MODAL - DAY 11
      ===================================================== */}

      {showShareModal && shareFile && (
        <div
          className="modal-overlay"
          onClick={closeShareModal}
        >
          <div
            className="share-modal day11-share-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2>Share File</h2>
                <p>
                  Share <strong>{shareFile.filename}</strong>
                </p>
              </div>

              <button
                className="modal-close"
                type="button"
                onClick={closeShareModal}
                disabled={sharing || publicLinkLoading || removingShareId}
              >
                ×
              </button>
            </div>

            <div className="share-tabs">
              <button
                type="button"
                className={shareTab === "people" ? "active" : ""}
                onClick={() => setShareTab("people")}
              >
                👥 People
              </button>

              <button
                type="button"
                className={shareTab === "link" ? "active" : ""}
                onClick={() => setShareTab("link")}
              >
                🔗 Public link
              </button>
            </div>

            {shareTab === "people" ? (
              <>
                <form onSubmit={handleShare}>
                  <label>Email address</label>
                  <input
                    autoFocus
                    type="email"
                    placeholder="Enter recipient email"
                    value={shareEmail}
                    onChange={(event) => setShareEmail(event.target.value)}
                    required
                  />

                  <label>Permission</label>
                  <select
                    value={shareRole}
                    onChange={(event) => setShareRole(event.target.value)}
                  >
                    <option value="viewer">
                      👁 Viewer — Can view/download
                    </option>
                    <option value="editor">
                      ✏️ Editor — Can modify
                    </option>
                  </select>

                  <div className="modal-actions">
                    <button
                      type="button"
                      className="cancel-button"
                      onClick={closeShareModal}
                      disabled={sharing}
                    >
                      Done
                    </button>
                    <button
                      type="submit"
                      className="create-folder-button"
                      disabled={sharing}
                    >
                      {sharing ? "Sharing..." : "Share"}
                    </button>
                  </div>
                </form>

                <div className="shared-users-section">
                  <h3>People with access</h3>

                  {sharedUsersLoading ? (
                    <div className="shared-users-loading">Loading...</div>
                  ) : sharedUsers.length === 0 ? (
                    <div className="shared-users-empty">
                      No shared users yet.
                    </div>
                  ) : (
                    <div className="shared-users-list">
                      {sharedUsers.map((user) => (
                        <div
                          className="shared-user-row"
                          key={user.share_id ?? `owner-${user.user_id}`}
                        >
                          <div className="shared-user-avatar">
                            {(user.name || user.email || "U")
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div className="shared-user-info">
                            <strong>{user.name || user.email || "User"}</strong>
                            <span>{user.email || ""}</span>
                          </div>

                          <span className="shared-user-role">
                            {user.role === "owner"
                              ? "Owner"
                              : user.role === "editor"
                              ? "Editor"
                              : "Viewer"}
                          </span>

                          {user.role !== "owner" && user.share_id && (
                            <button
                              type="button"
                              className="remove-share-button"
                              onClick={() => handleRemoveShare(user)}
                              disabled={removingShareId === user.share_id}
                            >
                              {removingShareId === user.share_id
                                ? "..."
                                : "Remove"}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="public-link-section">
                <div className="public-link-info">
                  <div className="public-link-icon">🔗</div>
                  <div>
                    <strong>Anyone with the link</strong>
                    <p>Anyone who has this link can access the shared file.</p>
                  </div>
                </div>

                <label>Link expiry</label>
                <select
                  value={publicExpiryDays}
                  onChange={(event) =>
                    setPublicExpiryDays(Number(event.target.value))
                  }
                  disabled={publicLinkLoading}
                >
                  <option value={1}>1 day</option>
                  <option value={7}>7 days</option>
                  <option value={30}>30 days</option>
                  <option value={90}>90 days</option>
                </select>

                {!publicLink ? (
                  <button
                    type="button"
                    className="create-public-link-button"
                    onClick={handleCreatePublicLink}
                    disabled={publicLinkLoading}
                  >
                    {publicLinkLoading ? "Creating link..." : "Create public link"}
                  </button>
                ) : (
                  <div className="public-link-result">
                    <input
                      type="text"
                      value={publicLink}
                      readOnly
                      onFocus={(event) => event.target.select()}
                    />
                    <button
                      type="button"
                      onClick={handleCopyPublicLink}
                    >
                      Copy
                    </button>
                  </div>
                )}

                <div className="modal-actions">
                  <button
                    type="button"
                    className="cancel-button"
                    onClick={closeShareModal}
                    disabled={publicLinkLoading}
                  >
                    Done
                  </button>
                </div>
              </div>
            )}

            {message && (
              <div className="share-modal-message">
                {message}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================
          VERSION HISTORY MODAL
      ===================================================== */}

      {showVersionModal && versionFile && (
        <div
          className="modal-overlay"
          onClick={closeVersionHistory}
        >
          <div
            className="share-modal day11-share-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="modal-header">
              <div>
                <h2>Version History</h2>
                <p>
                  <strong>{versionFile.filename}</strong>
                </p>
              </div>

              <button
                className="modal-close"
                type="button"
                onClick={closeVersionHistory}
                disabled={versionsLoading}
              >
                ×
              </button>
            </div>

            {versionsLoading ? (
              <div className="empty-state">
                <div className="loading-icon">
                  ☁
                </div>
                <h3>Loading versions...</h3>
                <p>Please wait.</p>
              </div>
            ) : versions.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  🕘
                </div>
                <h3>No previous versions</h3>
                <p>
                  Versions will appear here after
                  the file is replaced.
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  maxHeight: "420px",
                  overflowY: "auto",
                }}
              >
                {versions.map((version) => (
                  <div
                    key={version.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "12px",
                      padding: "12px",
                      border: "1px solid rgba(0,0,0,0.1)",
                      borderRadius: "10px",
                    }}
                  >
                    <div
                      style={{
                        minWidth: 0,
                        flex: 1,
                      }}
                    >
                      <strong>
                        Version {version.version_number}
                      </strong>

                      <p
                        style={{
                          margin: "4px 0 0",
                          fontSize: "13px",
                          opacity: 0.7,
                        }}
                      >
                        {formatFileSize(version.size)}
                        {" • "}
                        {version.created_at
                          ? new Date(
                              version.created_at
                            ).toLocaleString()
                          : "Unknown date"}
                      </p>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        flexShrink: 0,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          handleVersionDownload(
                            version
                          )
                        }
                      >
                        Download
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleVersionRestore(
                            version
                          )
                        }
                      >
                        Restore
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {message && (
              <div className="share-modal-message">
                {message}
              </div>
            )}

            <div className="modal-actions">
              <button
                type="button"
                className="cancel-button"
                onClick={closeVersionHistory}
                disabled={versionsLoading}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          FILE PREVIEW MODAL - DAY 10
      ===================================================== */}

      {(previewLoading || previewFile) && (
        <div
          className="modal-overlay preview-overlay"
          onClick={closePreview}
        >
          <div
            className="preview-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="modal-header">
              <div>
                <h2>
                  {previewFile?.filename ||
                    "Loading preview..."}
                </h2>

                {previewFile && (
                  <p>
                    {formatFileSize(
                      previewFile.size
                    )}
                  </p>
                )}
              </div>

              <button
                className="modal-close"
                type="button"
                onClick={closePreview}
              >
                ×
              </button>
            </div>

            {previewLoading ? (
              <div className="preview-loading">
                <div className="loading-icon">
                  ☁
                </div>
                <h3>Loading preview...</h3>
              </div>
            ) : previewFile?.content_type?.startsWith(
                "image/"
              ) ? (
              <div className="image-preview-container">
                <img
                  src={previewFile.previewUrl}
                  alt={previewFile.filename}
                  className="image-preview"
                />
              </div>
            ) : previewFile?.content_type ===
              "application/pdf" ? (
              <iframe
                src={previewFile.previewUrl}
                title={previewFile.filename}
                className="pdf-preview"
              />
            ) : null}
          </div>
        </div>
      )}

    </div>
  );
}

export default Dashboard;