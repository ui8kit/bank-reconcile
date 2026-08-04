import { mount } from "svelte"
import DocsApp from "./DocsApp.svelte"
import "./app.css"

mount(DocsApp, { target: document.getElementById("app")! })
