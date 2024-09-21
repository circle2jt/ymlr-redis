# Changes logs

## History

- [1.2.2-alpha.5.md](#1726896891917)  -  _9/21/2024, 5:34:51 AM_
- [1.2.2-alpha.4.md](#1726896170638)  -  _9/21/2024, 5:22:50 AM_
- [1.2.2-alpha.3.md](#1726846100973)  -  _9/20/2024, 3:28:20 PM_
- [1.2.2-alpha.2.md](#1725697888838)  -  _9/7/2024, 8:31:28 AM_
- [1.2.2-alpha.1.md](#1725695244834)  -  _9/7/2024, 7:47:24 AM_
- [1.2.2-alpha.0.md](#1725693155803)  -  _9/7/2024, 7:12:35 AM_
- [1.2.1.md](#1698739481393)  -  _10/31/2023, 8:04:41 AM_
- [1.2.1-alpha.0.md](#1698658953155)  -  _10/30/2023, 9:42:33 AM_
- [1.1.8-alpha.1.md](#1698592730579)  -  _10/29/2023, 3:18:50 PM_
- [1.1.8-alpha.0.md](#1697429789835)  -  _10/16/2023, 4:16:29 AM_
- [1.1.7.md](#1693292944886)  -  _8/29/2023, 7:09:04 AM_
- [1.1.6.md](#1682659885256)  -  _4/28/2023, 5:31:25 AM_
- [1.1.5.md](#1682154208053)  -  _4/22/2023, 9:03:28 AM_
- [1.1.4.md](#1682086415934)  -  _4/21/2023, 2:13:35 PM_
- [1.1.2.md](#1682049570733)  -  _4/21/2023, 3:59:30 AM_
- [1.1.1.md](#1681962216447)  -  _4/20/2023, 3:43:36 AM_

## Details

<a id="1726896891917"></a>
### 1.2.2-alpha.5

* fix: expose unsub to ymlr'redis (8d6de74)
  
<a id="1726896170638"></a>
### 1.2.2-alpha.4

* feat(remove)!: add ymlr-remove (1ec695d)
* fix: redis interupt (98d1014)
* fix(unsub): not unsub channel with all callback (5a4e516)
  
<a id="1726846100973"></a>
### 1.2.2-alpha.3

* fix(unsub): unsub and remove all of callback (59838c8)
  
<a id="1725697888838"></a>
### 1.2.2-alpha.2

* fix: clean redis sub unused when unsub (7aba28d)
  
<a id="1725695244834"></a>
### 1.2.2-alpha.1

* fix: not expose tag unsub (1fbe347)
  
<a id="1725693155803"></a>
### 1.2.2-alpha.0

* fix(lint): format code (7398f16)
* chore: update yarn lock (cd55473)
* Merge branch 'main' into dev (1aa8f8c)
* feat: add new tag redis'unsub (20b0ab9)
* scene: replace logger.log to logger.info (0048941)
* Update index.yaml (594da40)
* Update index.yaml (e53f999)
* fix: pass redis in parentState (e363300)
* refactor: replace typescript v4 to v5 (d5a347a)
* fix: update redis-query script (b8280b1)
  
<a id="1698739481393"></a>
### 1.2.1

* fix: support latest ymlr (19c1803)
* chore: prerelease 1.2.1-alpha.0 (6fc6cbe)
* refactor: Integrate with latest ymlr version (4a45014)
* chore: prerelease 1.1.8-alpha.1 (3c587a1)
* fix: integrate with latest ymlr (4a39f52)
* fix: Clean subscriber before dispose (35c4fc9)
* doc: Update redis query (6e97a12)
* doc: detach service (b27d007)
* chore: prerelease 1.1.8-alpha.0 (7644275)
* feat: add new queue job (4134bcb)
  
<a id="1698658953155"></a>
### 1.2.1-alpha.0

* refactor: Integrate with latest ymlr version (4a45014)
  
<a id="1698592730579"></a>
### 1.1.8-alpha.1

* fix: integrate with latest ymlr (4a39f52)
* fix: Clean subscriber before dispose (35c4fc9)
* doc: Update redis query (6e97a12)
* doc: detach service (b27d007)
  
<a id="1697429789835"></a>
### 1.1.8-alpha.0

* feat: add new queue job (4134bcb)
  
<a id="1693292944886"></a>
### 1.1.7

* fix: update latest ymlr version (ab98cb4)
* fix: auto detect redis to global to ignore dispose (2122b6b)
* hotfix: update script to query redis support " (0d8d65b)
  
<a id="1682659885256"></a>
### 1.1.6

* fix(pub,sub): inner logger not apply (a980d3e)
* doc: Add examples for command, pub/sub (929fe3c)
  
<a id="1682154208053"></a>
### 1.1.5

* fix: return callback id wrong (e142d7f)
  
<a id="1682086415934"></a>
### 1.1.4

* perf: clean resource when removecb, unsub (649acac)
  
<a id="1682049570733"></a>
### 1.1.2

* refactor!: add remove callback in subscribers (ddbe995)
  
<a id="1681962216447"></a>
### 1.1.1

* fix: could not subscribe many channels (91ddc83)

