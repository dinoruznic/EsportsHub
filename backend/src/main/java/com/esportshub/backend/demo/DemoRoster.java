package com.esportshub.backend.demo;

import java.util.List;

final class DemoRoster {

    record Player(String username, String displayName, String inGameName, String position, String rank, Integer rating) {
    }

    record DemoTeam(String name, String tag, List<Player> players) {

        String captain() {
            return players.getFirst().username();
        }
    }

    static final List<DemoTeam> LOL_TEAMS = List.of(
            new DemoTeam("Balkan Wolves", "BW", List.of(
                    lol("kap_wolves", "Emir Kovačević", "WolfEmir", "TOP", "DIAMOND"),
                    lol("tarik_mujic", "Tarik Mujić", "Tarkan", "JUNGLE", "EMERALD"),
                    lol("adnan_selimovic", "Adnan Selimović", "AdnanMid", "MID", "MASTER"),
                    lol("nermin_basic", "Nermin Bašić", "NerkoADC", "ADC", "DIAMOND"),
                    lol("edin_halilovic", "Edin Halilović", "EdoSupp", "SUPPORT", "EMERALD"))),
            new DemoTeam("Sarajevo Snipers", "SS", List.of(
                    lol("kap_snipers", "Haris Omerović", "Bascarsija", "JUNGLE", "MASTER"),
                    lol("mirza_alic", "Mirza Alić", "MirzaTop", "TOP", "DIAMOND"),
                    lol("kemal_dedic", "Kemal Dedić", "Kemo", "MID", "GRANDMASTER"),
                    lol("almir_zukic", "Almir Zukić", "Zuki", "ADC", "MASTER"),
                    lol("jasmin_pasic", "Jasmin Pašić", "Jasko", "SUPPORT", "DIAMOND"))),
            new DemoTeam("Drina Drakes", "DD", List.of(
                    lol("kap_drakes", "Amel Softić", "DrinaDrake", "MID", "GRANDMASTER"),
                    lol("senad_hasic", "Senad Hasić", "Senna", "TOP", "MASTER"),
                    lol("eldar_music", "Eldar Mušić", "EldarJG", "JUNGLE", "MASTER"),
                    lol("benjamin_salkic", "Benjamin Salkić", "Benji", "ADC", "DIAMOND"),
                    lol("ismar_hadzic", "Ismar Hadžić", "Ismo", "SUPPORT", "MASTER"))),
            new DemoTeam("Neretva Nexus", "NN", List.of(
                    lol("kap_nexus", "Dženan Ćatić", "Nexus", "ADC", "DIAMOND"),
                    lol("vedran_mikulic", "Vedran Mikulić", "Vedro", "TOP", "EMERALD"),
                    lol("ivan_maric", "Ivan Marić", "Ivke", "JUNGLE", "DIAMOND"),
                    lol("ante_bosnjak", "Ante Bošnjak", "AnteMid", "MID", "DIAMOND"),
                    lol("mario_zovko", "Mario Zovko", "Zovko", "SUPPORT", "PLATINUM"))),
            new DemoTeam("Una Unicorns", "UU", List.of(
                    lol("kap_unicorns", "Ajla Mehmedović", "UnaQueen", "SUPPORT", "DIAMOND"),
                    lol("aldin_besic", "Aldin Bešić", "Aldo", "TOP", "PLATINUM"),
                    lol("samir_karic", "Samir Karić", "SamJG", "JUNGLE", "EMERALD"),
                    lol("irfan_kadric", "Irfan Kadrić", "Irfo", "MID", "DIAMOND"),
                    lol("damir_kurtovic", "Damir Kurtović", "Kurta", "ADC", "EMERALD"))),
            new DemoTeam("Mostar Mavericks", "MM", List.of(
                    lol("kap_mavericks", "Nihad Kreso", "Maverick", "TOP", "EMERALD"),
                    lol("josip_pehar", "Josip Pehar", "Pehi", "JUNGLE", "PLATINUM"),
                    lol("enes_hadziomerovic", "Enes Hadžiomerović", "EnesMid", "MID", "EMERALD"),
                    lol("dario_ljubic", "Dario Ljubić", "Ljubo", "ADC", "DIAMOND"),
                    lol("mehmed_colakovic", "Mehmed Čolaković", "Meho", "SUPPORT", "GOLD"))),
            new DemoTeam("Tuzla Titans", "TT", List.of(
                    lol("kap_titans", "Nedim Hodžić", "SoTitan", "JUNGLE", "EMERALD"),
                    lol("alen_mujanovic", "Alen Mujanović", "AlenTop", "TOP", "GOLD"),
                    lol("kenan_tuzlic", "Kenan Tuzlić", "Tuzlak", "MID", "PLATINUM"),
                    lol("sanel_ahmetovic", "Sanel Ahmetović", "Sane", "ADC", "PLATINUM"),
                    lol("ermin_mehic", "Ermin Mehić", "Erko", "SUPPORT", "SILVER"))),
            new DemoTeam("Bihać Blaze", "BB", List.of(
                    lol("kap_blaze", "Elvir Ramić", "UnaBlaze", "MID", "PLATINUM"),
                    lol("dzevad_sabic", "Dževad Šabić", "Dzevo", "TOP", "GOLD"),
                    lol("adis_hukic", "Adis Hukić", "AdisJG", "JUNGLE", "PLATINUM"),
                    lol("zlatan_mesic", "Zlatan Mešić", "Zlaja", "ADC", "GOLD"),
                    lol("hamza_kovac", "Hamza Kovač", "Hamzi", "SUPPORT", "PLATINUM"))));

    static final List<DemoTeam> CS2_TEAMS = List.of(
            new DemoTeam("Sarajevo Five", "S5", List.of(
                    cs2("kap_five", "Mirza Hadžiahmetović", "mirzaIGL", "IGL", 17200),
                    cs2("anes_cengic", "Anes Čengić", "anesE", "ENTRY", 16800),
                    cs2("faruk_kapetanovic", "Faruk Kapetanović", "farukAWP", "AWP", 18900),
                    cs2("emin_sarajlic", "Emin Sarajlić", "eminS", "SUPPORT", 15400),
                    cs2("vedad_brkic", "Vedad Brkić", "vedadL", "LURKER", 16100))),
            new DemoTeam("Banja Luka Bulls", "BLB", List.of(
                    cs2("kap_bulls", "Nikola Savić", "nikoIGL", "IGL", 16500),
                    cs2("marko_jovanovic", "Marko Jovanović", "markoE", "ENTRY", 17400),
                    cs2("stefan_petrovic", "Stefan Petrović", "stefAWP", "AWP", 18100),
                    cs2("luka_djuric", "Luka Đurić", "lukaS", "SUPPORT", 14900),
                    cs2("milos_tomic", "Miloš Tomić", "milosL", "LURKER", 15800))));

    private DemoRoster() {
    }

    private static Player lol(String username, String displayName, String name, String position, String rank) {
        return new Player(username, displayName, name + "#EUW", position, rank, null);
    }

    private static Player cs2(String username, String displayName, String name, String position, int rating) {
        return new Player(username, displayName, name, position, null, rating);
    }
}
