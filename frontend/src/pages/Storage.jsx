import React, { useMemo, useState } from "react";
import "./Storage.css";

const initialFiles = [
  { name: "UNIT-1.pdf", type: "PDF", size: "7.9 MB" },
  { name: "Python.pdf", type: "PDF", size: "5.1 MB" },
  { name: "IMG_20250227_192913.jpg", type: "IMAGE", size: "3.7 MB" },
  {
    name: "object oriented programming with python.pdf",
    type: "PDF",
    size: "3.2 MB",
  },
  { name: "DATA STRUCTURE.pdf", type: "PDF", size: "3.1 MB" },
  {
    name: "CSE-III-DISCRETE-MATHEMATICAL-STRUCTURES-10CS34-NOTES.pdf",
    type: "PDF",
    size: "2.8 MB",
  },
];

export default function Storage() {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("storage");
  const [type, setType] = useState("all");
  const [modified, setModified] = useState("all");
  const [source, setSource] = useState("all");

  const filteredFiles = useMemo(() => {
    let result = [...initialFiles];

    if (search.trim()) {
      result = result.filter((file) =>
        file.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (type !== "all") {
      result = result.filter(
        (file) => file.type.toLowerCase() === type.toLowerCase()
      );
    }

    if (sort === "name") {
      result.sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [search, sort, type]);

  return (
    <div className="storage-app">

      {/* LEFT SIDEBAR */}
      <aside className="storage-sidebar">

        <div className="drive-brand">
          <div className="brand-logo">
            ☁
          </div>
          <span>Drive</span>
        </div>

        <button className="new-button">
          <span className="plus">+</span>
          <span>New</span>
        </button>

        <nav className="side-navigation">

          <a href="#" className="nav-item">
            <span className="nav-icon">⌂</span>
            <span>Home</span>
          </a>

          <a href="#" className="nav-item">
            <span className="nav-icon">▣</span>
            <span>Projects</span>
          </a>

          <a href="#" className="nav-item expandable">
            <span className="arrow">▸</span>
            <span className="nav-icon">▣</span>
            <span>My Drive</span>
          </a>

          <a href="#" className="nav-item expandable">
            <span className="arrow">▸</span>
            <span className="nav-icon">▰</span>
            <span>Computers</span>
          </a>

          <a href="#" className="nav-item">
            <span className="nav-icon">♧</span>
            <span>Shared with me</span>
          </a>

          <a href="#" className="nav-item">
            <span className="nav-icon">◷</span>
            <span>Recent</span>
          </a>

          <a href="#" className="nav-item">
            <span className="nav-icon">☆</span>
            <span>Starred</span>
          </a>

          <a href="#" className="nav-item">
            <span className="nav-icon">!</span>
            <span>Spam</span>
          </a>

          <a href="#" className="nav-item">
            <span className="nav-icon">▥</span>
            <span>Trash</span>
          </a>

          <a href="#" className="nav-item active">
            <span className="nav-icon">☁</span>
            <span>Storage</span>
          </a>

        </nav>

        {/* STORAGE INFO */}
        <div className="sidebar-storage">

          <div className="storage-mini-bar">
            <div className="storage-mini-fill"></div>
          </div>

          <div className="storage-mini-text">
            1.42 GB of 5 TB used
          </div>

          <button className="get-storage-btn">
            Get more storage
          </button>

        </div>

      </aside>


      {/* MAIN CONTENT */}
      <main className="storage-main">

        {/* TOP HEADER */}
        <header className="top-header">

          <div className="top-search">

            <span className="search-icon">⌕</span>

            <input
              type="text"
              placeholder="Get answers from Drive"
            />

            <span className="search-extra">☷</span>
            <span className="search-extra">☰</span>

          </div>

          <div className="top-actions">
            <span>✓</span>
            <span>?</span>
            <span>⚙</span>
            <span>✦</span>
            <span>⠿</span>

            <div className="profile">
              m
            </div>
          </div>

        </header>


        {/* CONTENT */}
        <section className="storage-content">

          <div className="storage-heading-row">

            <h1>Storage</h1>

            <div className="backup-link">
              Backups
              <span>ⓘ</span>
            </div>

          </div>


          {/* FILTERS */}
          <div className="filters">

            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="all">Type</option>
              <option value="pdf">PDF</option>
              <option value="image">Image</option>
            </select>

            <select
              value={modified}
              onChange={(e) => setModified(e.target.value)}
            >
              <option value="all">Modified</option>
              <option value="today">Today</option>
              <option value="week">This week</option>
              <option value="month">This month</option>
            </select>

            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
            >
              <option value="all">Source</option>
              <option value="drive">Drive</option>
              <option value="shared">Shared</option>
            </select>

          </div>


          {/* STORAGE USAGE */}
          <div className="usage-section">

            <div className="usage-title">
              <strong>1.42 GB</strong>
              <span>of 5 TB used</span>
            </div>

            <div className="usage-bar">

              <div className="usage-blue"></div>
              <div className="usage-yellow"></div>
              <div className="usage-red"></div>
              <div className="usage-gray"></div>

            </div>

            <div className="usage-legend">

              <span>
                <i className="dot blue"></i>
                Google Drive
              </span>

              <span>
                <i className="dot yellow"></i>
                Google Photos
              </span>

              <span>
                <i className="dot red"></i>
                Gmail
              </span>

              <span>
                <i className="dot gray"></i>
                Other
              </span>

            </div>

          </div>


          {/* ACTIONS */}
          <div className="storage-actions">

            <button className="storage-upgrade">
              <span>ⓘ</span>
              Get more storage
            </button>

            <button className="clean-space">
              Clean up space
            </button>

          </div>


          {/* FILE SEARCH */}
          <div className="file-toolbar">

            <div className="file-search">

              <span>⌕</span>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search files..."
              />

            </div>

          </div>


          {/* TABLE HEADER */}
          <div className="file-table-header">

            <span>Name</span>

            <button
              className="storage-sort"
              onClick={() =>
                setSort(sort === "storage" ? "name" : "storage")
              }
            >
              Storage used
              <span className="sort-arrow">↓</span>
            </button>

          </div>


          {/* FILE LIST */}
          <div className="file-list">

            {filteredFiles.length === 0 ? (

              <div className="empty-files">
                No files found
              </div>

            ) : (

              filteredFiles.map((file, index) => (

                <div className="file-row" key={index}>

                  <div className="file-name">

                    <div
                      className={
                        file.type === "IMAGE"
                          ? "file-type image-type"
                          : "file-type pdf-type"
                      }
                    >
                      {file.type === "IMAGE" ? "▣" : "PDF"}
                    </div>

                    <span>{file.name}</span>

                  </div>

                  <div className="file-size">
                    {file.size}
                  </div>

                </div>

              ))

            )}

          </div>

        </section>

      </main>


      {/* RIGHT SIDE BAR */}
      <aside className="right-toolbar">

        <div>▣</div>
        <div>💡</div>
        <div>✓</div>
        <div>♟</div>

        <div className="right-divider"></div>

        <div className="right-plus">+</div>

      </aside>

    </div>
  );
}